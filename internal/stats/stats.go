// Package stats answers dashboard questions from the hourly aggregates.
package stats

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Dimensions that can be broken down, mapped to their column.
var dimColumns = map[string]string{
	"page":         "path",
	"landing":      "path",
	"referrer":     "referrer",
	"channel":      "channel",
	"utm_source":   "utm_source",
	"utm_medium":   "utm_medium",
	"utm_campaign": "utm_campaign",
	"country":      "country",
	"browser":      "browser",
	"os":           "os",
	"device":       "device",
	"event":        "event_name",
}

// Dimensions that can be used as filters. Custom events are excluded: they
// are counted separately from pageviews, so filtering by one would hide all
// pageview metrics.
var filterable = map[string]bool{
	"page": true, "referrer": true, "channel": true, "utm_source": true, "utm_medium": true,
	"utm_campaign": true, "country": true, "browser": true, "os": true, "device": true,
}

// IsDimension reports whether name is a known breakdown dimension.
func IsDimension(name string) bool { _, ok := dimColumns[name]; return ok }

// IsFilterable reports whether name can be used as a filter.
func IsFilterable(name string) bool { return filterable[name] }

type Filter struct {
	Dim   string `json:"dim"`
	Value string `json:"value"`
}

// Range is a half-open interval [From, To) of whole local days.
type Range struct {
	From, To time.Time
	Loc      *time.Location
}

// Days returns the number of local days in the range.
func (r Range) Days() int {
	return int(r.To.Sub(r.From).Round(time.Hour).Hours()+12) / 24
}

const MaxDays = 366 * 5

var ErrRange = errors.New("invalid date range")

// ParseRange builds a Range from inclusive YYYY-MM-DD bounds in loc.
func ParseRange(from, to string, loc *time.Location) (Range, error) {
	f, err1 := time.ParseInLocation("2006-01-02", from, loc)
	t, err2 := time.ParseInLocation("2006-01-02", to, loc)
	if err1 != nil || err2 != nil || t.Before(f) {
		return Range{}, ErrRange
	}
	r := Range{From: f, To: t.AddDate(0, 0, 1), Loc: loc}
	if r.Days() > MaxDays {
		return Range{}, ErrRange
	}
	return r, nil
}

// Compare returns the comparison range: "previous" (same length immediately
// before) or "year" (same dates one year earlier).
func (r Range) Compare(mode string) (Range, bool) {
	switch mode {
	case "previous":
		days := r.Days()
		return Range{From: r.From.AddDate(0, 0, -days), To: r.From, Loc: r.Loc}, true
	case "year":
		return Range{From: r.From.AddDate(-1, 0, 0), To: r.To.AddDate(-1, 0, 0), Loc: r.Loc}, true
	}
	return Range{}, false
}

// Granularity picks a bucket size that keeps charts readable.
func (r Range) Granularity() string {
	switch d := r.Days(); {
	case d <= 2:
		return "hour"
	case d <= 93:
		return "day"
	case d <= 400:
		return "week"
	default:
		return "month"
	}
}

type Query struct {
	SiteID  int64
	Range   Range
	Filters []Filter
}

// where builds the shared WHERE clause and its arguments.
func (q Query) where() (string, []any) {
	args := []any{q.SiteID, q.Range.From.UTC(), q.Range.To.UTC()}
	var b strings.Builder
	b.WriteString("site_id = $1 AND hour >= $2 AND hour < $3")
	for _, f := range q.Filters {
		col, ok := dimColumns[f.Dim]
		if !ok || !filterable[f.Dim] {
			continue
		}
		args = append(args, f.Value)
		fmt.Fprintf(&b, " AND %s = $%d", col, len(args))
	}
	return b.String(), args
}

type Service struct{ Pool *pgxpool.Pool }

type Totals struct {
	Pageviews int64 `json:"pageviews"`
	Visits    int64 `json:"visits"`
	Events    int64 `json:"events"`
}

const metricCols = `COALESCE(sum(hits) FILTER (WHERE kind = 1), 0),
	COALESCE(sum(arrivals) FILTER (WHERE kind = 1), 0),
	COALESCE(sum(hits) FILTER (WHERE kind = 2), 0)`

func (s *Service) Totals(ctx context.Context, q Query) (Totals, error) {
	where, args := q.where()
	var t Totals
	err := s.Pool.QueryRow(ctx, `SELECT `+metricCols+` FROM stats_hourly WHERE `+where, args...).
		Scan(&t.Pageviews, &t.Visits, &t.Events)
	return t, err
}

type Point struct {
	Time      string `json:"time"` // local wall-clock bucket start, "2006-01-02T15:04"
	Pageviews int64  `json:"pageviews"`
	Visits    int64  `json:"visits"`
	Events    int64  `json:"events"`
}

// Series returns one point per bucket across the whole range, including empty
// buckets, in the range's local time zone.
func (s *Service) Series(ctx context.Context, q Query, granularity string) ([]Point, error) {
	switch granularity {
	case "hour", "day", "week", "month":
	default:
		return nil, fmt.Errorf("bad granularity %q", granularity)
	}
	where, args := q.where()
	args = append(args, q.Range.Loc.String())
	tzArg := "$" + strconv.Itoa(len(args))
	rows, err := s.Pool.Query(ctx, `
		SELECT date_trunc('`+granularity+`', hour AT TIME ZONE `+tzArg+`) AS bucket, `+metricCols+`
		FROM stats_hourly WHERE `+where+` GROUP BY 1 ORDER BY 1`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	got := map[string]Point{}
	for rows.Next() {
		var b time.Time
		var p Point
		if err := rows.Scan(&b, &p.Pageviews, &p.Visits, &p.Events); err != nil {
			return nil, err
		}
		p.Time = b.Format("2006-01-02T15:04")
		got[p.Time] = p
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return fillBuckets(q.Range, granularity, got), nil
}

// fillBuckets enumerates every bucket in the range so charts have no gaps.
func fillBuckets(r Range, granularity string, got map[string]Point) []Point {
	start := truncLocal(r.From.In(r.Loc), granularity)
	end := r.To.In(r.Loc)
	out := []Point{}
	for t := start; t.Before(end); t = step(t, granularity) {
		// Wall-clock key, independent of the zone offset.
		key := time.Date(t.Year(), t.Month(), t.Day(), t.Hour(), 0, 0, 0, time.UTC).Format("2006-01-02T15:04")
		p, ok := got[key]
		if !ok {
			p = Point{Time: key}
		}
		out = append(out, p)
		if len(out) > 10_000 {
			break
		}
	}
	return out
}

func truncLocal(t time.Time, g string) time.Time {
	y, m, d := t.Date()
	switch g {
	case "hour":
		return time.Date(y, m, d, t.Hour(), 0, 0, 0, t.Location())
	case "week":
		wd := (int(t.Weekday()) + 6) % 7 // Monday = 0, matches PostgreSQL
		return time.Date(y, m, d-wd, 0, 0, 0, 0, t.Location())
	case "month":
		return time.Date(y, m, 1, 0, 0, 0, 0, t.Location())
	}
	return time.Date(y, m, d, 0, 0, 0, 0, t.Location())
}

func step(t time.Time, g string) time.Time {
	switch g {
	case "hour":
		return t.Add(time.Hour)
	case "week":
		return t.AddDate(0, 0, 7)
	case "month":
		return t.AddDate(0, 1, 0)
	}
	return t.AddDate(0, 0, 1)
}

type Row struct {
	Value     string `json:"value"`
	Pageviews int64  `json:"pageviews"`
	Visits    int64  `json:"visits"`
	Events    int64  `json:"events"`
}

type Breakdown struct {
	Dim    string `json:"dim"`
	Metric string `json:"metric"` // the metric rows are ranked by
	Rows   []Row  `json:"rows"`
	Total  int64  `json:"total"` // denominator for shares
}

// PrimaryMetric is the metric a dimension is ranked by: acquisition and
// audience dimensions by visits, pages by pageviews, events by count.
func PrimaryMetric(dim string) string {
	switch dim {
	case "page":
		return "pageviews"
	case "event":
		return "events"
	}
	return "visits"
}

// Breakdown returns the top values of a dimension.
func (s *Service) Breakdown(ctx context.Context, q Query, dim, search string, limit int) (Breakdown, error) {
	col, ok := dimColumns[dim]
	if !ok {
		return Breakdown{}, fmt.Errorf("unknown dimension %q", dim)
	}
	if limit <= 0 || limit > 1000 {
		limit = 10
	}
	metric := PrimaryMetric(dim)
	where, args := q.where()

	kindCond := "kind = 1"
	if dim == "event" {
		kindCond = "kind = 2"
	}
	cond := where + " AND " + kindCond + " AND " + col + " <> ''"
	if dim == "landing" {
		cond += " AND arrivals > 0"
	}
	if search = strings.TrimSpace(search); search != "" {
		args = append(args, "%"+escapeLike(search)+"%")
		cond += fmt.Sprintf(" AND %s ILIKE $%d", col, len(args))
	}
	order := map[string]string{"pageviews": "2", "visits": "3", "events": "4"}[metric]
	args = append(args, limit)
	rows, err := s.Pool.Query(ctx, fmt.Sprintf(`
		SELECT %s, %s FROM stats_hourly WHERE %s
		GROUP BY 1 HAVING sum(hits) > 0 ORDER BY %s DESC, 1 ASC LIMIT $%d`,
		col, metricCols, cond, order, len(args)), args...)
	if err != nil {
		return Breakdown{}, err
	}
	defer rows.Close()
	out := Breakdown{Dim: dim, Metric: metric, Rows: []Row{}}
	for rows.Next() {
		var r Row
		if err := rows.Scan(&r.Value, &r.Pageviews, &r.Visits, &r.Events); err != nil {
			return out, err
		}
		out.Rows = append(out.Rows, r)
	}
	if err := rows.Err(); err != nil {
		return out, err
	}

	t, err := s.Totals(ctx, q)
	if err != nil {
		return out, err
	}
	switch metric {
	case "pageviews":
		out.Total = t.Pageviews
	case "visits":
		out.Total = t.Visits
	default:
		out.Total = t.Events
	}
	return out, nil
}

func escapeLike(s string) string {
	return strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`).Replace(s)
}

// PagePattern converts a goal page pattern ("/blog/*") into a LIKE pattern.
// "*" matches any run of characters; everything else is literal.
func PagePattern(p string) string {
	parts := strings.Split(p, "*")
	for i := range parts {
		parts[i] = escapeLike(parts[i])
	}
	return strings.Join(parts, "%")
}

type GoalDef struct {
	ID    int64
	Kind  string
	Match string
}

// GoalCounts returns completions per goal ID for the query.
func (s *Service) GoalCounts(ctx context.Context, q Query, goals []GoalDef) (map[int64]int64, error) {
	out := make(map[int64]int64, len(goals))
	if len(goals) == 0 {
		return out, nil
	}
	where, args := q.where()
	cols := make([]string, len(goals))
	for i, g := range goals {
		switch g.Kind {
		case "event":
			args = append(args, g.Match)
			cols[i] = fmt.Sprintf("COALESCE(sum(hits) FILTER (WHERE kind = 2 AND event_name = $%d), 0)", len(args))
		default:
			args = append(args, PagePattern(g.Match))
			cols[i] = fmt.Sprintf("COALESCE(sum(hits) FILTER (WHERE kind = 1 AND path LIKE $%d), 0)", len(args))
		}
	}
	vals := make([]int64, len(goals))
	dest := make([]any, len(goals))
	for i := range vals {
		dest[i] = &vals[i]
	}
	if err := s.Pool.QueryRow(ctx, `SELECT `+strings.Join(cols, ", ")+` FROM stats_hourly WHERE `+where, args...).Scan(dest...); err != nil {
		return nil, err
	}
	for i, g := range goals {
		out[g.ID] = vals[i]
	}
	return out, nil
}

// HasData reports whether the site has any aggregates in the range.
func (s *Service) HasData(ctx context.Context, siteID int64) (bool, error) {
	var ok bool
	err := s.Pool.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM stats_hourly WHERE site_id = $1)`, siteID).Scan(&ok)
	return ok, err
}
