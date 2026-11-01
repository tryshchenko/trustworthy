package server

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"

	"github.com/tryshchenko/trustworthy/internal/ingest"
	"github.com/tryshchenko/trustworthy/internal/tracker"
)

func (s *Server) handleScript(w http.ResponseWriter, r *http.Request) {
	h := w.Header()
	h.Set("Content-Type", "application/javascript; charset=utf-8")
	h.Set("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400")
	h.Set("Access-Control-Allow-Origin", "*")
	h.Set("Cross-Origin-Resource-Policy", "cross-origin")
	h.Set("ETag", tracker.ETag)
	h.Add("Vary", "Accept-Encoding")
	if r.Header.Get("If-None-Match") == tracker.ETag {
		w.WriteHeader(http.StatusNotModified)
		return
	}
	if strings.Contains(r.Header.Get("Accept-Encoding"), "gzip") {
		h.Set("Content-Encoding", "gzip")
		_, _ = w.Write(tracker.Gzipped)
		return
	}
	_, _ = w.Write(tracker.Script)
}

func collectCORS(w http.ResponseWriter) {
	h := w.Header()
	h.Set("Access-Control-Allow-Origin", "*")
	h.Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	h.Set("Access-Control-Allow-Headers", "Content-Type")
	h.Set("Access-Control-Max-Age", "86400")
	h.Set("Cache-Control", "no-store")
}

func (s *Server) handleCollectPreflight(w http.ResponseWriter, r *http.Request) {
	collectCORS(w)
	w.WriteHeader(http.StatusNoContent)
}

// handleCollect receives one pageview or custom event. The request's IP
// address and User-Agent are used only transiently (rate limiting and coarse
// browser/OS classification) and are never stored or logged.
func (s *Server) handleCollect(w http.ResponseWriter, r *http.Request) {
	collectCORS(w)
	if !s.collectLimit.Allow(s.clientKey(r)) {
		w.WriteHeader(http.StatusTooManyRequests)
		return
	}
	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 4<<10))
	if err != nil {
		writeError(w, http.StatusRequestEntityTooLarge, "payload too large")
		return
	}
	var p ingest.Payload
	if err := json.Unmarshal(body, &p); err != nil {
		writeError(w, http.StatusBadRequest, "invalid payload")
		return
	}
	req := ingest.Request{Payload: p, UserAgent: r.UserAgent()}
	if s.cfg.CountryHeader != "" {
		req.CountryCode = r.Header.Get(s.cfg.CountryHeader)
	}
	hit, err := ingest.Collect(req, s.sites)
	switch {
	case errors.Is(err, ingest.ErrBot):
		w.WriteHeader(http.StatusAccepted) // silently ignored
		return
	case errors.Is(err, ingest.ErrUnknownSite):
		writeError(w, http.StatusNotFound, "this domain is not registered in the dashboard")
		return
	case err != nil:
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	s.buffer.Add(hit)
	w.WriteHeader(http.StatusAccepted)
}
