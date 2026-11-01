package server

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/tryshchenko/trustworthy/internal/db"
	"github.com/tryshchenko/trustworthy/internal/stats"
)

type rangeJSON struct {
	From        string `json:"from"`
	To          string `json:"to"`
	Granularity string `json:"granularity,omitempty"`
	Timezone    string `json:"timezone,omitempty"`
}

func toRangeJSON(r stats.Range) rangeJSON {
	return rangeJSON{
		From: r.From.In(r.Loc).Format("2006-01-02"),
		To:   r.To.In(r.Loc).AddDate(0, 0, -1).Format("2006-01-02"),
	}
}

// parseQuery reads from/to/filter parameters. Without from/to it defaults to
// the last 30 days (including today) in the site's time zone.
func parseQuery(r *http.Request, site db.Site) (stats.Query, error) {
	loc, err := time.LoadLocation(site.Timezone)
	if err != nil {
		loc = time.UTC
	}
	v := r.URL.Query()
	from, to := v.Get("from"), v.Get("to")
	if from == "" || to == "" {
		today := time.Now().In(loc)
		to = today.Format("2006-01-02")
		from = today.AddDate(0, 0, -29).Format("2006-01-02")
	}
	rng, err := stats.ParseRange(from, to, loc)
	if err != nil {
		return stats.Query{}, err
	}
	q := stats.Query{SiteID: site.ID, Range: rng}
	for _, f := range v["filter"] {
		dim, val, ok := strings.Cut(f, ":")
		if !ok || !stats.IsFilterable(dim) {
			return q, fmt.Errorf("invalid filter %q", f)
		}
		if len(q.Filters) >= 8 {
			return q, fmt.Errorf("too many filters")
		}
		q.Filters = append(q.Filters, stats.Filter{Dim: dim, Value: val})
	}
	return q, nil
}

type overviewResponse struct {
	Range         rangeJSON     `json:"range"`
	CompareRange  *rangeJSON    `json:"compareRange"`
	Totals        stats.Totals  `json:"totals"`
	CompareTotals *stats.Totals `json:"compareTotals"`
	Series        []stats.Point `json:"series"`
	CompareSeries []stats.Point `json:"compareSeries"`
}

func (s *Server) handleOverview(w http.ResponseWriter, r *http.Request) {
	site, ok := s.loadSite(w, r)
	if !ok {
		return
	}
	q, err := parseQuery(r, site)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	g := q.Range.Granularity()
	ctx := r.Context()
	resp := overviewResponse{Range: toRangeJSON(q.Range)}
	resp.Range.Granularity, resp.Range.Timezone = g, site.Timezone

	if resp.Totals, err = s.stats.Totals(ctx, q); err != nil {
		s.internalError(w, r, err)
		return
	}
	if resp.Series, err = s.stats.Series(ctx, q, g); err != nil {
		s.internalError(w, r, err)
		return
	}
	if cr, ok := q.Range.Compare(r.URL.Query().Get("compare")); ok {
		cq := q
		cq.Range = cr
		ct, err := s.stats.Totals(ctx, cq)
		if err != nil {
			s.internalError(w, r, err)
			return
		}
		cs, err := s.stats.Series(ctx, cq, g)
		if err != nil {
			s.internalError(w, r, err)
			return
		}
		crj := toRangeJSON(cr)
		resp.CompareRange, resp.CompareTotals, resp.CompareSeries = &crj, &ct, cs
	}
	writeJSON(w, http.StatusOK, resp)
}

func (s *Server) handleBreakdown(w http.ResponseWriter, r *http.Request) {
	site, ok := s.loadSite(w, r)
	if !ok {
		return
	}
	q, err := parseQuery(r, site)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	dim := r.URL.Query().Get("dim")
	if !stats.IsDimension(dim) {
		writeError(w, http.StatusBadRequest, "unknown dimension")
		return
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	b, err := s.stats.Breakdown(r.Context(), q, dim, r.URL.Query().Get("q"), limit)
	if err != nil {
		s.internalError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, b)
}

type goalStat struct {
	db.Goal
	Completions        int64    `json:"completions"`
	Rate               float64  `json:"rate"`
	CompareCompletions *int64   `json:"compareCompletions"`
	CompareRate        *float64 `json:"compareRate"`
}

func rate(n, visits int64) float64 {
	if visits == 0 {
		return 0
	}
	return float64(n) / float64(visits) * 100
}

func (s *Server) handleGoalStats(w http.ResponseWriter, r *http.Request) {
	site, ok := s.loadSite(w, r)
	if !ok {
		return
	}
	q, err := parseQuery(r, site)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	ctx := r.Context()
	goals, err := s.store.Goals(ctx, site.ID)
	if err != nil {
		s.internalError(w, r, err)
		return
	}
	defs := make([]stats.GoalDef, len(goals))
	for i, g := range goals {
		defs[i] = stats.GoalDef{ID: g.ID, Kind: g.Kind, Match: g.Match}
	}
	counts, err := s.stats.GoalCounts(ctx, q, defs)
	if err != nil {
		s.internalError(w, r, err)
		return
	}
	totals, err := s.stats.Totals(ctx, q)
	if err != nil {
		s.internalError(w, r, err)
		return
	}
	var cCounts map[int64]int64
	var cTotals stats.Totals
	cr, hasCompare := q.Range.Compare(r.URL.Query().Get("compare"))
	if hasCompare {
		cq := q
		cq.Range = cr
		if cCounts, err = s.stats.GoalCounts(ctx, cq, defs); err != nil {
			s.internalError(w, r, err)
			return
		}
		if cTotals, err = s.stats.Totals(ctx, cq); err != nil {
			s.internalError(w, r, err)
			return
		}
	}
	out := make([]goalStat, len(goals))
	for i, g := range goals {
		out[i] = goalStat{Goal: g, Completions: counts[g.ID], Rate: rate(counts[g.ID], totals.Visits)}
		if hasCompare {
			c := cCounts[g.ID]
			cr := rate(c, cTotals.Visits)
			out[i].CompareCompletions, out[i].CompareRate = &c, &cr
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"visits": totals.Visits, "goals": out})
}

func (s *Server) handleRealtime(w http.ResponseWriter, r *http.Request) {
	site, ok := s.loadSite(w, r)
	if !ok {
		return
	}
	writeJSON(w, http.StatusOK, s.realtime.Snapshot(site.ID))
}

func (s *Server) handleExport(w http.ResponseWriter, r *http.Request) {
	site, ok := s.loadSite(w, r)
	if !ok {
		return
	}
	q, err := parseQuery(r, site)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	rj := toRangeJSON(q.Range)
	name := fmt.Sprintf("%s_%s_%s.csv", strings.ReplaceAll(site.Domain, ".", "-"), rj.From, rj.To)
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename="`+name+`"`)
	w.Header().Set("Cache-Control", "no-store")
	if err := s.stats.ExportCSV(r.Context(), q, w); err != nil {
		s.log.Error("export failed", "err", err)
	}
}
