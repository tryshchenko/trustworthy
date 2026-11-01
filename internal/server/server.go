// Package server wires the HTTP API, the collection endpoint, the tracking
// script and the embedded dashboard together.
package server

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/json"
	"errors"
	"log/slog"
	"net"
	"net/http"
	"runtime/debug"
	"strings"
	"sync"
	"time"

	"github.com/tryshchenko/trustworthy/internal/auth"
	"github.com/tryshchenko/trustworthy/internal/config"
	"github.com/tryshchenko/trustworthy/internal/db"
	"github.com/tryshchenko/trustworthy/internal/ingest"
	"github.com/tryshchenko/trustworthy/internal/stats"
)

type Server struct {
	cfg      config.Config
	log      *slog.Logger
	store    *db.Store
	stats    *stats.Service
	buffer   *ingest.Buffer
	realtime *ingest.Realtime
	sites    *siteCache
	version  string

	ipSalt       []byte
	collectLimit *auth.Limiter
	loginLimit   *auth.Limiter

	setupMu   sync.Mutex
	setupCode string // non-empty while the owner account has not been created
}

type Options struct {
	Config   config.Config
	Logger   *slog.Logger
	Store    *db.Store
	Stats    *stats.Service
	Buffer   *ingest.Buffer
	Realtime *ingest.Realtime
	Version  string
}

func New(o Options) *Server {
	salt := make([]byte, 32)
	_, _ = rand.Read(salt)
	return &Server{
		cfg:          o.Config,
		log:          o.Logger,
		store:        o.Store,
		stats:        o.Stats,
		buffer:       o.Buffer,
		realtime:     o.Realtime,
		sites:        newSiteCache(o.Store),
		version:      o.Version,
		ipSalt:       salt,
		collectLimit: auth.NewLimiter(300, time.Minute),
		loginLimit:   auth.NewLimiter(8, 15*time.Minute),
	}
}

// SetSetupCode enables first-run setup with the given one-time code.
func (s *Server) SetSetupCode(code string) {
	s.setupMu.Lock()
	s.setupCode = code
	s.setupMu.Unlock()
}

func (s *Server) currentSetupCode() string {
	s.setupMu.Lock()
	defer s.setupMu.Unlock()
	return s.setupCode
}

// Init loads caches. Call once before serving.
func (s *Server) Init(ctx context.Context) error { return s.sites.reload(ctx) }

// Maintain runs periodic housekeeping until ctx is done.
func (s *Server) Maintain(ctx context.Context) {
	t := time.NewTicker(time.Minute)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			if err := s.sites.reload(ctx); err != nil && ctx.Err() == nil {
				s.log.Warn("reload sites", "err", err)
			}
			s.collectLimit.Sweep()
			s.loginLimit.Sweep()
		}
	}
}

func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()

	// Public: health, tracking script, collection.
	mux.HandleFunc("GET /healthz", s.handleHealth)
	mux.HandleFunc("GET /readyz", s.handleReady)
	mux.HandleFunc("GET /js/script.js", s.handleScript)
	mux.HandleFunc("POST /api/event", s.handleCollect)
	mux.HandleFunc("OPTIONS /api/event", s.handleCollectPreflight)

	// Auth.
	mux.HandleFunc("GET /api/session", s.handleSession)
	mux.HandleFunc("POST /api/setup", s.handleSetup)
	mux.HandleFunc("POST /api/login", s.handleLogin)
	mux.HandleFunc("POST /api/logout", s.handleLogout)
	mux.Handle("PUT /api/account", s.requireAuth(s.handleUpdateAccount))

	// Sites & goals.
	mux.Handle("GET /api/sites", s.requireAuth(s.handleListSites))
	mux.Handle("POST /api/sites", s.requireAuth(s.handleCreateSite))
	mux.Handle("GET /api/sites/{id}", s.requireAuth(s.handleGetSite))
	mux.Handle("PUT /api/sites/{id}", s.requireAuth(s.handleUpdateSite))
	mux.Handle("DELETE /api/sites/{id}", s.requireAuth(s.handleDeleteSite))
	mux.Handle("POST /api/sites/{id}/reset", s.requireAuth(s.handleResetSite))
	mux.Handle("GET /api/sites/{id}/goals", s.requireAuth(s.handleListGoals))
	mux.Handle("POST /api/sites/{id}/goals", s.requireAuth(s.handleCreateGoal))
	mux.Handle("DELETE /api/sites/{id}/goals/{goal}", s.requireAuth(s.handleDeleteGoal))

	// Stats.
	mux.Handle("GET /api/sites/{id}/overview", s.requireAuth(s.handleOverview))
	mux.Handle("GET /api/sites/{id}/breakdown", s.requireAuth(s.handleBreakdown))
	mux.Handle("GET /api/sites/{id}/goal-stats", s.requireAuth(s.handleGoalStats))
	mux.Handle("GET /api/sites/{id}/realtime", s.requireAuth(s.handleRealtime))
	mux.Handle("GET /api/sites/{id}/export", s.requireAuth(s.handleExport))

	mux.HandleFunc("/api/", func(w http.ResponseWriter, r *http.Request) {
		writeError(w, http.StatusNotFound, "not found")
	})

	// Dashboard (single-page app).
	mux.Handle("/", spaHandler())

	return s.recoverer(s.logRequests(s.securityHeaders(s.csrf(mux))))
}

/* ------------------------------------------------------------- middleware */

type statusWriter struct {
	http.ResponseWriter
	status int
}

func (w *statusWriter) WriteHeader(code int) {
	w.status = code
	w.ResponseWriter.WriteHeader(code)
}

func (w *statusWriter) Unwrap() http.ResponseWriter { return w.ResponseWriter }

// logRequests logs method, path (without query) and status. It never logs IP
// addresses, User-Agent strings or query strings.
func (s *Server) logRequests(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		sw := &statusWriter{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(sw, r)
		if r.URL.Path == "/api/event" || r.URL.Path == "/healthz" || r.URL.Path == "/readyz" {
			if sw.status < 500 {
				return // high volume; nothing useful to log
			}
		}
		s.log.Debug("http", "method", r.Method, "path", r.URL.Path, "status", sw.status, "dur", time.Since(start).Round(time.Microsecond))
	})
}

func (s *Server) recoverer(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if v := recover(); v != nil {
				if v == http.ErrAbortHandler {
					panic(v)
				}
				s.log.Error("panic", "path", r.URL.Path, "err", v, "stack", string(debug.Stack()))
				writeError(w, http.StatusInternalServerError, "internal error")
			}
		}()
		next.ServeHTTP(w, r)
	})
}

const dashboardCSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"

func (s *Server) securityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("Referrer-Policy", "same-origin")
		if r.URL.Path != "/js/script.js" && r.URL.Path != "/api/event" {
			h.Set("Content-Security-Policy", dashboardCSP)
			h.Set("X-Frame-Options", "DENY")
			h.Set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), interest-cohort=()")
		}
		next.ServeHTTP(w, r)
	})
}

// csrf rejects cross-site state-changing requests to the dashboard API. The
// public collection endpoint is exempt by design.
func (s *Server) csrf(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet, http.MethodHead, http.MethodOptions:
			next.ServeHTTP(w, r)
			return
		}
		if r.URL.Path == "/api/event" {
			next.ServeHTTP(w, r)
			return
		}
		if site := r.Header.Get("Sec-Fetch-Site"); site != "" && site != "same-origin" && site != "none" {
			writeError(w, http.StatusForbidden, "cross-site request blocked")
			return
		}
		if origin := r.Header.Get("Origin"); origin != "" && !sameHost(origin, r.Host) {
			writeError(w, http.StatusForbidden, "cross-site request blocked")
			return
		}
		next.ServeHTTP(w, r)
	})
}

func sameHost(origin, host string) bool {
	o := strings.TrimPrefix(strings.TrimPrefix(origin, "https://"), "http://")
	return strings.EqualFold(o, host)
}

/* ---------------------------------------------------------------- helpers */

// clientKey returns an opaque, salted hash of the client IP for in-memory
// rate limiting. The raw IP is never stored, and the salt is regenerated on
// every start, so keys cannot be linked across restarts.
func (s *Server) clientKey(r *http.Request) string {
	ip := s.clientIP(r)
	h := sha256.New()
	h.Write(s.ipSalt)
	h.Write([]byte(ip))
	return string(h.Sum(nil)[:16])
}

func (s *Server) clientIP(r *http.Request) string {
	if s.cfg.TrustProxy {
		if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
			parts := strings.Split(xff, ",")
			// The right-most entry was appended by our own proxy.
			if ip := strings.TrimSpace(parts[len(parts)-1]); ip != "" {
				return ip
			}
		}
		if ip := strings.TrimSpace(r.Header.Get("X-Real-Ip")); ip != "" {
			return ip
		}
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

func (s *Server) isHTTPS(r *http.Request) bool {
	if r.TLS != nil {
		return true
	}
	return s.cfg.TrustProxy && strings.EqualFold(r.Header.Get("X-Forwarded-Proto"), "https")
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func decodeJSON(w http.ResponseWriter, r *http.Request, v any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, 64<<10)
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(v); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return false
	}
	return true
}

func (s *Server) internalError(w http.ResponseWriter, r *http.Request, err error) {
	if errors.Is(err, context.Canceled) {
		return
	}
	s.log.Error("request failed", "path", r.URL.Path, "err", err)
	writeError(w, http.StatusInternalServerError, "internal error")
}

/* ----------------------------------------------------------------- health */

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "version": s.version})
}

func (s *Server) handleReady(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()
	if err := s.store.Pool.Ping(ctx); err != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"status": "database unavailable"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"status": "ok", "pending": s.buffer.Pending()})
}
