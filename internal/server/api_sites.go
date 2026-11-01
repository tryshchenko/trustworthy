package server

import (
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/tryshchenko/trustworthy/internal/db"
	"github.com/tryshchenko/trustworthy/internal/privacy"
)

// Site accent colours, chosen to read well on the Aero Scenic palette.
var siteColors = []string{"#1A78E6", "#12B8AE", "#7C5CE6", "#E8833A", "#D6457A", "#2F9E5B", "#0EA5C6", "#B5651D"}

func pathID(r *http.Request, name string) (int64, bool) {
	id, err := strconv.ParseInt(r.PathValue(name), 10, 64)
	return id, err == nil && id > 0
}

// loadSite resolves the {id} path parameter, writing a 404 if needed.
func (s *Server) loadSite(w http.ResponseWriter, r *http.Request) (db.Site, bool) {
	id, ok := pathID(r, "id")
	if !ok {
		writeError(w, http.StatusNotFound, "site not found")
		return db.Site{}, false
	}
	site, err := s.store.Site(r.Context(), id)
	if errors.Is(err, db.ErrNotFound) {
		writeError(w, http.StatusNotFound, "site not found")
		return site, false
	}
	if err != nil {
		s.internalError(w, r, err)
		return site, false
	}
	return site, true
}

// NormalizeDomain accepts "example.com", "https://www.example.com/blog" etc.
func NormalizeDomain(in string) (string, error) {
	in = strings.TrimSpace(in)
	if in == "" {
		return "", errors.New("enter your website's domain, e.g. example.com")
	}
	if !strings.Contains(in, "://") {
		in = "https://" + in
	}
	u, err := url.Parse(in)
	if err != nil || u.Hostname() == "" {
		return "", errors.New("that doesn't look like a domain")
	}
	host := privacy.NormalizeHost(u.Hostname())
	if host == "" || (!strings.Contains(host, ".") && host != "localhost") {
		return "", errors.New("that doesn't look like a domain")
	}
	return host, nil
}

type siteInput struct {
	Domain        string  `json:"domain"`
	Name          string  `json:"name"`
	Timezone      string  `json:"timezone"`
	RetentionDays *int    `json:"retentionDays"`
	Color         *string `json:"color"`
}

func (s *Server) validateSite(in siteInput, base db.Site) (db.Site, error) {
	out := base
	domain, err := NormalizeDomain(in.Domain)
	if err != nil {
		return out, err
	}
	out.Domain = domain
	out.Name = strings.TrimSpace(in.Name)
	if out.Name == "" {
		out.Name = domain
	}
	if utf8.RuneCountInString(out.Name) > 80 {
		return out, errors.New("name must be 80 characters or fewer")
	}
	tz := strings.TrimSpace(in.Timezone)
	if tz == "" {
		tz = "UTC"
	}
	if _, err := time.LoadLocation(tz); err != nil || tz == "Local" {
		return out, fmt.Errorf("unknown time zone %q", tz)
	}
	out.Timezone = tz
	if in.RetentionDays != nil {
		if *in.RetentionDays < 0 || *in.RetentionDays > 3660 {
			return out, errors.New("retention must be between 0 (forever) and 3660 days")
		}
		out.RetentionDays = *in.RetentionDays
	}
	if in.Color != nil {
		c := strings.ToUpper(strings.TrimSpace(*in.Color))
		if len(c) != 7 || c[0] != '#' || strings.Trim(c[1:], "0123456789ABCDEF") != "" {
			return out, errors.New("color must be a hex value like #1A78E6")
		}
		out.Color = c
	}
	return out, nil
}

func (s *Server) handleListSites(w http.ResponseWriter, r *http.Request) {
	sites, err := s.store.Sites(r.Context())
	if err != nil {
		s.internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, sites)
}

func (s *Server) handleGetSite(w http.ResponseWriter, r *http.Request) {
	if site, ok := s.loadSite(w, r); ok {
		writeJSON(w, http.StatusOK, site)
	}
}

func (s *Server) handleCreateSite(w http.ResponseWriter, r *http.Request) {
	var in siteInput
	if !decodeJSON(w, r, &in) {
		return
	}
	existing, err := s.store.Sites(r.Context())
	if err != nil {
		s.internalError(w, r, err)
		return
	}
	base := db.Site{RetentionDays: s.cfg.DefaultRetentionDays, Color: siteColors[len(existing)%len(siteColors)]}
	site, err := s.validateSite(in, base)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	site, err = s.store.CreateSite(r.Context(), site)
	if errors.Is(err, db.ErrConflict) {
		writeError(w, http.StatusConflict, "this domain is already added")
		return
	}
	if err != nil {
		s.internalError(w, r, err)
		return
	}
	if err := s.sites.reload(r.Context()); err != nil {
		s.log.Warn("reload sites", "err", err)
	}
	writeJSON(w, http.StatusCreated, site)
}

func (s *Server) handleUpdateSite(w http.ResponseWriter, r *http.Request) {
	cur, ok := s.loadSite(w, r)
	if !ok {
		return
	}
	var in siteInput
	if !decodeJSON(w, r, &in) {
		return
	}
	site, err := s.validateSite(in, cur)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	site, err = s.store.UpdateSite(r.Context(), site)
	if errors.Is(err, db.ErrConflict) {
		writeError(w, http.StatusConflict, "another site already uses this domain")
		return
	}
	if err != nil {
		s.internalError(w, r, err)
		return
	}
	if err := s.sites.reload(r.Context()); err != nil {
		s.log.Warn("reload sites", "err", err)
	}
	writeJSON(w, http.StatusOK, site)
}

func (s *Server) handleDeleteSite(w http.ResponseWriter, r *http.Request) {
	site, ok := s.loadSite(w, r)
	if !ok {
		return
	}
	if err := s.store.DeleteSite(r.Context(), site.ID); err != nil {
		s.internalError(w, r, err)
		return
	}
	s.realtime.Forget(site.ID)
	if err := s.sites.reload(r.Context()); err != nil {
		s.log.Warn("reload sites", "err", err)
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (s *Server) handleResetSite(w http.ResponseWriter, r *http.Request) {
	site, ok := s.loadSite(w, r)
	if !ok {
		return
	}
	if err := s.store.ResetSiteData(r.Context(), site.ID); err != nil {
		s.internalError(w, r, err)
		return
	}
	s.realtime.Forget(site.ID)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

/* ------------------------------------------------------------------ goals */

type goalInput struct {
	Name  string `json:"name"`
	Kind  string `json:"kind"`
	Match string `json:"match"`
}

func validateGoal(in goalInput) (db.Goal, error) {
	g := db.Goal{Name: strings.TrimSpace(in.Name), Kind: in.Kind}
	switch in.Kind {
	case "event":
		g.Match = privacy.SanitizeEventName(in.Match)
		if g.Match == "" {
			return g, errors.New("enter the event name to match")
		}
	case "page":
		m := strings.TrimSpace(in.Match)
		if m == "" {
			return g, errors.New("enter a page path, e.g. /thank-you or /blog/*")
		}
		if !strings.HasPrefix(m, "/") {
			m = "/" + m
		}
		if len(m) > privacy.MaxPathLen {
			return g, errors.New("page path is too long")
		}
		// Normalise like collected paths (but keep "*" wildcards intact).
		if len(m) > 1 {
			m = strings.TrimRight(m, "/")
		}
		g.Match = m
	default:
		return g, errors.New("goal type must be event or page")
	}
	if g.Name == "" {
		g.Name = g.Match
	}
	if utf8.RuneCountInString(g.Name) > 80 {
		return g, errors.New("name must be 80 characters or fewer")
	}
	return g, nil
}

func (s *Server) handleListGoals(w http.ResponseWriter, r *http.Request) {
	site, ok := s.loadSite(w, r)
	if !ok {
		return
	}
	goals, err := s.store.Goals(r.Context(), site.ID)
	if err != nil {
		s.internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, goals)
}

func (s *Server) handleCreateGoal(w http.ResponseWriter, r *http.Request) {
	site, ok := s.loadSite(w, r)
	if !ok {
		return
	}
	var in goalInput
	if !decodeJSON(w, r, &in) {
		return
	}
	g, err := validateGoal(in)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	existing, err := s.store.Goals(r.Context(), site.ID)
	if err != nil {
		s.internalError(w, r, err)
		return
	}
	if len(existing) >= 50 {
		writeError(w, http.StatusBadRequest, "a site can have up to 50 goals")
		return
	}
	g.SiteID = site.ID
	g, err = s.store.CreateGoal(r.Context(), g)
	if errors.Is(err, db.ErrConflict) {
		writeError(w, http.StatusConflict, "a goal with this match already exists")
		return
	}
	if err != nil {
		s.internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusCreated, g)
}

func (s *Server) handleDeleteGoal(w http.ResponseWriter, r *http.Request) {
	site, ok := s.loadSite(w, r)
	if !ok {
		return
	}
	gid, ok := pathID(r, "goal")
	if !ok {
		writeError(w, http.StatusNotFound, "goal not found")
		return
	}
	if err := s.store.DeleteGoal(r.Context(), site.ID, gid); err != nil {
		if errors.Is(err, db.ErrNotFound) {
			writeError(w, http.StatusNotFound, "goal not found")
			return
		}
		s.internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}
