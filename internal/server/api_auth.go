package server

import (
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/tryshchenko/trustworthy/internal/auth"
	"github.com/tryshchenko/trustworthy/internal/db"
)

const sessionCookie = "tw_session"

type ctxKey int

const ctxSessionHash ctxKey = 1

func (s *Server) sessionHash(r *http.Request) []byte {
	c, err := r.Cookie(sessionCookie)
	if err != nil || c.Value == "" || len(c.Value) > 128 {
		return nil
	}
	return auth.HashToken(c.Value)
}

func (s *Server) requireAuth(next http.HandlerFunc) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := s.sessionHash(r)
		if h == nil {
			writeError(w, http.StatusUnauthorized, "sign in required")
			return
		}
		ok, err := s.store.SessionValid(r.Context(), h)
		if err != nil {
			s.internalError(w, r, err)
			return
		}
		if !ok {
			writeError(w, http.StatusUnauthorized, "sign in required")
			return
		}
		next(w, r.WithContext(context.WithValue(r.Context(), ctxSessionHash, h)))
	})
}

func (s *Server) setSessionCookie(w http.ResponseWriter, r *http.Request, token string, expires time.Time) {
	secure := s.cfg.SecureCookies == "true" || (s.cfg.SecureCookies == "auto" && s.isHTTPS(r))
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookie,
		Value:    token,
		Path:     "/",
		Expires:  expires,
		MaxAge:   int(time.Until(expires).Seconds()),
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
	})
}

func (s *Server) startSession(w http.ResponseWriter, r *http.Request) error {
	token, hash := auth.NewToken()
	expires := time.Now().Add(s.cfg.SessionTTL)
	if err := s.store.CreateSession(r.Context(), hash, expires); err != nil {
		return err
	}
	s.setSessionCookie(w, r, token, expires)
	return nil
}

type sessionResponse struct {
	Authenticated bool   `json:"authenticated"`
	SetupRequired bool   `json:"setupRequired"`
	Email         string `json:"email,omitempty"`
	BaseURL       string `json:"baseUrl,omitempty"`
	Version       string `json:"version"`
}

func (s *Server) handleSession(w http.ResponseWriter, r *http.Request) {
	resp := sessionResponse{BaseURL: s.cfg.BaseURL, Version: s.version}
	hasOwner, err := s.store.HasOwner(r.Context())
	if err != nil {
		s.internalError(w, r, err)
		return
	}
	resp.SetupRequired = !hasOwner
	if h := s.sessionHash(r); h != nil && hasOwner {
		ok, err := s.store.SessionValid(r.Context(), h)
		if err != nil {
			s.internalError(w, r, err)
			return
		}
		if ok {
			o, err := s.store.Owner(r.Context())
			if err != nil {
				s.internalError(w, r, err)
				return
			}
			resp.Authenticated, resp.Email = true, o.Email
		}
	}
	writeJSON(w, http.StatusOK, resp)
}

type credentials struct {
	Email     string `json:"email"`
	Password  string `json:"password"`
	SetupCode string `json:"setupCode,omitempty"`
}

func (s *Server) handleSetup(w http.ResponseWriter, r *http.Request) {
	var c credentials
	if !decodeJSON(w, r, &c) {
		return
	}
	key := s.clientKey(r)
	if s.loginLimit.Blocked(key) {
		writeError(w, http.StatusTooManyRequests, "too many attempts — try again in a few minutes")
		return
	}
	code := s.currentSetupCode()
	if code == "" {
		writeError(w, http.StatusConflict, "setup has already been completed")
		return
	}
	if !auth.SetupCodeMatches(code, c.SetupCode) {
		s.loginLimit.Allow(key)
		writeError(w, http.StatusForbidden, "that setup code is not correct")
		return
	}
	email, err := auth.NormalizeEmail(c.Email)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	hash, err := auth.HashPassword(c.Password)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := s.store.CreateOwner(r.Context(), email, hash); err != nil {
		if errors.Is(err, db.ErrConflict) {
			writeError(w, http.StatusConflict, "setup has already been completed")
			return
		}
		s.internalError(w, r, err)
		return
	}
	s.SetSetupCode("")
	s.log.Info("owner account created")
	if err := s.startSession(w, r); err != nil {
		s.internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	var c credentials
	if !decodeJSON(w, r, &c) {
		return
	}
	key := s.clientKey(r)
	if s.loginLimit.Blocked(key) {
		writeError(w, http.StatusTooManyRequests, "too many attempts — try again in a few minutes")
		return
	}
	o, err := s.store.Owner(r.Context())
	if err != nil && !errors.Is(err, db.ErrNotFound) {
		s.internalError(w, r, err)
		return
	}
	email, _ := auth.NormalizeEmail(c.Email)
	pwOK := auth.CheckPasswordOrDummy(o.PasswordHash, c.Password)
	if !pwOK || email == "" || email != o.Email {
		s.loginLimit.Allow(key)
		writeError(w, http.StatusUnauthorized, "email or password is incorrect")
		return
	}
	s.loginLimit.Reset(key)
	if err := s.startSession(w, r); err != nil {
		s.internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (s *Server) handleLogout(w http.ResponseWriter, r *http.Request) {
	if h := s.sessionHash(r); h != nil {
		if err := s.store.DeleteSession(r.Context(), h); err != nil {
			s.internalError(w, r, err)
			return
		}
	}
	http.SetCookie(w, &http.Cookie{Name: sessionCookie, Value: "", Path: "/", MaxAge: -1, HttpOnly: true, SameSite: http.SameSiteLaxMode})
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

type accountUpdate struct {
	Email           string `json:"email"`
	CurrentPassword string `json:"currentPassword"`
	NewPassword     string `json:"newPassword,omitempty"`
}

func (s *Server) handleUpdateAccount(w http.ResponseWriter, r *http.Request) {
	var u accountUpdate
	if !decodeJSON(w, r, &u) {
		return
	}
	o, err := s.store.Owner(r.Context())
	if err != nil {
		s.internalError(w, r, err)
		return
	}
	if !auth.CheckPassword(o.PasswordHash, u.CurrentPassword) {
		writeError(w, http.StatusForbidden, "current password is incorrect")
		return
	}
	email, err := auth.NormalizeEmail(u.Email)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	hash := o.PasswordHash
	if u.NewPassword != "" {
		if hash, err = auth.HashPassword(u.NewPassword); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
	}
	if err := s.store.UpdateOwner(r.Context(), email, hash); err != nil {
		s.internalError(w, r, err)
		return
	}
	if u.NewPassword != "" {
		// Sign out every other device after a password change.
		cur, _ := r.Context().Value(ctxSessionHash).([]byte)
		if err := s.store.DeleteAllSessions(r.Context(), cur); err != nil {
			s.internalError(w, r, err)
			return
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "email": email})
}
