package ingest

import (
	"testing"
	"time"
)

func TestRealtimeWindow(t *testing.T) {
	now := time.Date(2026, 3, 1, 12, 0, 30, 0, time.UTC)
	rt := NewRealtime()
	rt.now = func() time.Time { return now }

	add := func(ago time.Duration, path, ref string, arrival bool) {
		rt.Add(Hit{SiteID: 1, Time: now.Add(-ago), Arrival: arrival, Dims: Dims{Kind: KindPageview, Path: path, Referrer: ref}})
	}
	add(0, "/", "google.com", true)
	add(time.Minute, "/", "", false)
	add(2*time.Minute, "/pricing", "news.ycombinator.com", true)
	add(10*time.Minute, "/blog", "", false)
	add(45*time.Minute, "/old", "", true) // outside the window: ignored
	rt.Add(Hit{SiteID: 1, Time: now, Dims: Dims{Kind: KindEvent, EventName: "Signup"}})
	rt.Add(Hit{SiteID: 2, Time: now, Dims: Dims{Kind: KindPageview, Path: "/other"}})

	s := rt.Snapshot(1)
	if len(s.Minutes) != RealtimeWindow {
		t.Fatalf("minutes = %d", len(s.Minutes))
	}
	if s.Pageviews != 4 || s.Visits != 2 || s.Events != 1 || s.Last5 != 3 {
		t.Fatalf("snapshot = %+v", s)
	}
	if s.Minutes[RealtimeWindow-1].Pageviews != 1 || !s.Minutes[RealtimeWindow-1].Time.Equal(now.Truncate(time.Minute)) {
		t.Fatalf("last minute = %+v", s.Minutes[RealtimeWindow-1])
	}
	if s.TopPages[0] != (LabelCount{"/", 2}) {
		t.Fatalf("top pages = %+v", s.TopPages)
	}
	if len(s.TopSources) != 2 {
		t.Fatalf("top sources = %+v", s.TopSources)
	}

	// Thirty minutes later everything has aged out.
	now = now.Add(31 * time.Minute)
	if s := rt.Snapshot(1); s.Pageviews != 0 || len(s.TopPages) != 0 {
		t.Fatalf("stale data survived: %+v", s)
	}
	rt.Forget(1)
	if s := rt.Snapshot(1); s.Pageviews != 0 {
		t.Fatal("forget failed")
	}
}
