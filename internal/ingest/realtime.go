package ingest

import (
	"sort"
	"sync"
	"time"
)

// RealtimeWindow is how far back the live view reaches.
const RealtimeWindow = 30

const maxLabelsPerMinute = 400

type minuteBucket struct {
	minute   int64 // unix minute
	views    int64
	arrivals int64
	events   int64
	paths    map[string]int64
	sources  map[string]int64
}

// Realtime keeps per-minute counters for the last 30 minutes, per site, in
// memory only. It holds counts, never anything per visitor.
type Realtime struct {
	mu    sync.Mutex
	sites map[int64]*[RealtimeWindow]minuteBucket
	now   func() time.Time
}

func NewRealtime() *Realtime {
	return &Realtime{sites: make(map[int64]*[RealtimeWindow]minuteBucket), now: time.Now}
}

func (r *Realtime) Add(h Hit) {
	m := h.Time.Unix() / 60
	if m < r.now().Unix()/60-RealtimeWindow {
		return
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	ring, ok := r.sites[h.SiteID]
	if !ok {
		ring = new([RealtimeWindow]minuteBucket)
		r.sites[h.SiteID] = ring
	}
	b := &ring[m%RealtimeWindow]
	if b.minute != m {
		*b = minuteBucket{minute: m, paths: map[string]int64{}, sources: map[string]int64{}}
	}
	if h.Dims.Kind == KindEvent {
		b.events++
		return
	}
	b.views++
	if len(b.paths) < maxLabelsPerMinute || b.paths[h.Dims.Path] > 0 {
		b.paths[h.Dims.Path]++
	}
	if h.Arrival {
		b.arrivals++
		src := h.Dims.Referrer
		if src == "" {
			src = h.Dims.Channel
		}
		if src != "" && (len(b.sources) < maxLabelsPerMinute || b.sources[src] > 0) {
			b.sources[src]++
		}
	}
}

// Forget drops a site's live counters (e.g. after the site is deleted).
func (r *Realtime) Forget(siteID int64) {
	r.mu.Lock()
	delete(r.sites, siteID)
	r.mu.Unlock()
}

type MinutePoint struct {
	Time      time.Time `json:"time"`
	Pageviews int64     `json:"pageviews"`
	Visits    int64     `json:"visits"`
}

type LabelCount struct {
	Label string `json:"label"`
	Count int64  `json:"count"`
}

type Snapshot struct {
	Minutes    []MinutePoint `json:"minutes"` // oldest first, one per minute
	Pageviews  int64         `json:"pageviews"`
	Visits     int64         `json:"visits"`
	Events     int64         `json:"events"`
	Last5      int64         `json:"pageviewsLast5"`
	TopPages   []LabelCount  `json:"topPages"`
	TopSources []LabelCount  `json:"topSources"`
}

// Snapshot summarises the last 30 minutes for a site.
func (r *Realtime) Snapshot(siteID int64) Snapshot {
	nowMin := r.now().Unix() / 60
	s := Snapshot{Minutes: make([]MinutePoint, RealtimeWindow), TopPages: []LabelCount{}, TopSources: []LabelCount{}}
	paths := map[string]int64{}
	sources := map[string]int64{}

	r.mu.Lock()
	ring := r.sites[siteID]
	for i := range RealtimeWindow {
		m := nowMin - int64(RealtimeWindow-1-i)
		s.Minutes[i].Time = time.Unix(m*60, 0).UTC()
		if ring == nil {
			continue
		}
		b := ring[m%RealtimeWindow]
		if b.minute != m {
			continue
		}
		s.Minutes[i].Pageviews = b.views
		s.Minutes[i].Visits = b.arrivals
		s.Pageviews += b.views
		s.Visits += b.arrivals
		s.Events += b.events
		if m > nowMin-5 {
			s.Last5 += b.views
		}
		for k, v := range b.paths {
			paths[k] += v
		}
		for k, v := range b.sources {
			sources[k] += v
		}
	}
	r.mu.Unlock()

	s.TopPages = top(paths, 8)
	s.TopSources = top(sources, 8)
	return s
}

func top(m map[string]int64, n int) []LabelCount {
	out := make([]LabelCount, 0, len(m))
	for k, v := range m {
		out = append(out, LabelCount{k, v})
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Count != out[j].Count {
			return out[i].Count > out[j].Count
		}
		return out[i].Label < out[j].Label
	})
	if len(out) > n {
		out = out[:n]
	}
	return out
}
