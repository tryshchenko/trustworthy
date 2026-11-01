package stats

import (
	"testing"
	"time"
)

func mustLoc(t *testing.T, name string) *time.Location {
	t.Helper()
	l, err := time.LoadLocation(name)
	if err != nil {
		t.Fatal(err)
	}
	return l
}

func TestParseRange(t *testing.T) {
	berlin := mustLoc(t, "Europe/Berlin")
	r, err := ParseRange("2026-03-01", "2026-03-31", berlin)
	if err != nil {
		t.Fatal(err)
	}
	if r.Days() != 31 {
		t.Fatalf("days = %d", r.Days()) // includes the DST switch on 29 March
	}
	if got := r.From.UTC().Format(time.RFC3339); got != "2026-02-28T23:00:00Z" {
		t.Fatalf("from = %s", got)
	}
	if got := r.To.UTC().Format(time.RFC3339); got != "2026-03-31T22:00:00Z" {
		t.Fatalf("to = %s", got)
	}
	for _, bad := range [][2]string{{"2026-03-02", "2026-03-01"}, {"x", "2026-03-01"}, {"2010-01-01", "2026-01-01"}} {
		if _, err := ParseRange(bad[0], bad[1], berlin); err == nil {
			t.Errorf("ParseRange(%v) should fail", bad)
		}
	}
}

func TestCompareRanges(t *testing.T) {
	r, _ := ParseRange("2026-03-08", "2026-03-14", time.UTC)
	prev, ok := r.Compare("previous")
	if !ok || prev.From.Format("2006-01-02") != "2026-03-01" || prev.To.Format("2006-01-02") != "2026-03-08" {
		t.Fatalf("previous = %v..%v", prev.From, prev.To)
	}
	year, _ := r.Compare("year")
	if year.From.Format("2006-01-02") != "2025-03-08" {
		t.Fatalf("year = %v", year.From)
	}
	if _, ok := r.Compare("none"); ok {
		t.Fatal("none should not compare")
	}
}

func TestGranularity(t *testing.T) {
	cases := map[[2]string]string{
		{"2026-03-01", "2026-03-01"}: "hour",
		{"2026-03-01", "2026-03-02"}: "hour",
		{"2026-03-01", "2026-03-07"}: "day",
		{"2026-01-01", "2026-03-31"}: "day",
		{"2025-04-01", "2026-03-31"}: "week",
		{"2024-01-01", "2026-03-31"}: "month",
	}
	for in, want := range cases {
		r, _ := ParseRange(in[0], in[1], time.UTC)
		if got := r.Granularity(); got != want {
			t.Errorf("%v: granularity %s, want %s", in, got, want)
		}
	}
}

func TestFillBucketsHasNoGaps(t *testing.T) {
	ny := mustLoc(t, "America/New_York")
	r, _ := ParseRange("2026-03-08", "2026-03-08", ny) // DST day: 23 hours
	pts := fillBuckets(r, "hour", map[string]Point{"2026-03-08T05:00": {Time: "2026-03-08T05:00", Pageviews: 3}})
	if len(pts) != 23 {
		t.Fatalf("hours = %d", len(pts))
	}
	found := false
	for _, p := range pts {
		if p.Time == "2026-03-08T05:00" && p.Pageviews == 3 {
			found = true
		}
	}
	if !found {
		t.Fatal("data point lost")
	}

	r, _ = ParseRange("2026-03-01", "2026-03-31", time.UTC)
	if n := len(fillBuckets(r, "day", nil)); n != 31 {
		t.Fatalf("days = %d", n)
	}
	weeks := fillBuckets(r, "week", nil)
	if weeks[0].Time != "2026-02-23T00:00" { // Monday on or before 1 March
		t.Fatalf("first week = %s", weeks[0].Time)
	}
	r, _ = ParseRange("2025-01-15", "2026-03-31", time.UTC)
	months := fillBuckets(r, "month", nil)
	if len(months) != 15 || months[0].Time != "2025-01-01T00:00" {
		t.Fatalf("months = %d, first %s", len(months), months[0].Time)
	}
}

func TestPagePattern(t *testing.T) {
	cases := map[string]string{
		"/thank-you":   "/thank-you",
		"/blog/*":      "/blog/%",
		"/*/checkout":  "/%/checkout",
		"/100%_sale":   `/100\%\_sale`,
		`/back\slash*`: `/back\\slash%`,
	}
	for in, want := range cases {
		if got := PagePattern(in); got != want {
			t.Errorf("PagePattern(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestQueryWhereIgnoresUnknownFilters(t *testing.T) {
	r, _ := ParseRange("2026-03-01", "2026-03-02", time.UTC)
	q := Query{SiteID: 1, Range: r, Filters: []Filter{
		{Dim: "country", Value: "DE"},
		{Dim: "path; DROP TABLE sites", Value: "x"},
		{Dim: "event", Value: "Signup"},
	}}
	where, args := q.where()
	if where != "site_id = $1 AND hour >= $2 AND hour < $3 AND country = $4" || len(args) != 4 {
		t.Fatalf("where = %q args=%v", where, args)
	}
}
