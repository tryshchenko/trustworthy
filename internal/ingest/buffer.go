package ingest

import (
	"context"
	"log/slog"
	"sync"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// maxPending bounds memory if the database is unreachable for a long time.
// Each entry is one (site, hour, dimensions) counter, not one hit, so this
// covers a very large amount of traffic.
const maxPending = 250_000

const flushChunk = 2_000

type bucketKey struct {
	site    int64
	hour    int64 // unix seconds, truncated to the hour
	dimsKey int64
}

type counter struct {
	dims     Dims
	hits     int64
	arrivals int64
}

// Buffer folds hits into hourly counters in memory and periodically writes
// them to PostgreSQL with additive UPSERTs.
type Buffer struct {
	pool     *pgxpool.Pool
	log      *slog.Logger
	realtime *Realtime

	mu      sync.Mutex
	pending map[bucketKey]*counter
	seen    map[int64]time.Time // site -> latest hit time in this batch
	dropped int64
}

func NewBuffer(pool *pgxpool.Pool, rt *Realtime, log *slog.Logger) *Buffer {
	return &Buffer{
		pool:     pool,
		log:      log,
		realtime: rt,
		pending:  make(map[bucketKey]*counter),
		seen:     make(map[int64]time.Time),
	}
}

// Add records a hit. It never blocks on I/O.
func (b *Buffer) Add(h Hit) {
	if b.realtime != nil {
		b.realtime.Add(h)
	}
	k := bucketKey{site: h.SiteID, hour: h.Time.Truncate(time.Hour).Unix(), dimsKey: h.Dims.Key()}
	b.mu.Lock()
	defer b.mu.Unlock()
	c, ok := b.pending[k]
	if !ok {
		if len(b.pending) >= maxPending {
			b.dropped++
			return
		}
		c = &counter{dims: h.Dims}
		b.pending[k] = c
	}
	c.hits++
	if h.Arrival {
		c.arrivals++
	}
	if t := b.seen[h.SiteID]; h.Time.After(t) {
		b.seen[h.SiteID] = h.Time
	}
}

// Pending returns the number of counters waiting to be flushed.
func (b *Buffer) Pending() int {
	b.mu.Lock()
	defer b.mu.Unlock()
	return len(b.pending)
}

// Run flushes every interval until ctx is cancelled, then flushes once more.
func (b *Buffer) Run(ctx context.Context, interval time.Duration) {
	t := time.NewTicker(interval)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			fctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
			if err := b.Flush(fctx); err != nil {
				b.log.Error("final flush failed", "err", err)
			}
			cancel()
			return
		case <-t.C:
			if err := b.Flush(ctx); err != nil {
				b.log.Warn("flush failed; will retry", "err", err)
			}
		}
	}
}

// Flush writes all pending counters. On failure the counters are merged back
// so that the next flush retries them.
func (b *Buffer) Flush(ctx context.Context) error {
	b.mu.Lock()
	batch := b.pending
	seen := b.seen
	dropped := b.dropped
	b.pending = make(map[bucketKey]*counter, len(batch))
	b.seen = make(map[int64]time.Time)
	b.dropped = 0
	b.mu.Unlock()

	if dropped > 0 {
		b.log.Warn("ingest buffer was full; hits were dropped", "dropped", dropped)
	}
	if len(batch) == 0 {
		return nil
	}

	keys := make([]bucketKey, 0, len(batch))
	for k := range batch {
		keys = append(keys, k)
	}
	for start := 0; start < len(keys); start += flushChunk {
		end := min(start+flushChunk, len(keys))
		if err := b.write(ctx, keys[start:end], batch); err != nil {
			b.restore(keys[start:], batch, seen)
			return err
		}
	}
	if err := b.touchSites(ctx, seen); err != nil {
		b.log.Warn("update site activity", "err", err)
	}
	return nil
}

func (b *Buffer) write(ctx context.Context, keys []bucketKey, batch map[bucketKey]*counter) error {
	n := len(keys)
	var (
		site     = make([]int64, n)
		hour     = make([]time.Time, n)
		dkey     = make([]int64, n)
		kind     = make([]int16, n)
		path     = make([]string, n)
		ref      = make([]string, n)
		channel  = make([]string, n)
		src      = make([]string, n)
		med      = make([]string, n)
		camp     = make([]string, n)
		country  = make([]string, n)
		browser  = make([]string, n)
		os       = make([]string, n)
		device   = make([]string, n)
		event    = make([]string, n)
		hits     = make([]int64, n)
		arrivals = make([]int64, n)
	)
	for i, k := range keys {
		c := batch[k]
		d := c.dims
		site[i], hour[i], dkey[i] = k.site, time.Unix(k.hour, 0).UTC(), k.dimsKey
		kind[i] = int16(d.Kind)
		path[i], ref[i], channel[i] = d.Path, d.Referrer, d.Channel
		src[i], med[i], camp[i] = d.UTMSource, d.UTMMedium, d.UTMCampaign
		country[i], browser[i], os[i], device[i], event[i] = d.Country, d.Browser, d.OS, d.Device, d.EventName
		hits[i], arrivals[i] = c.hits, c.arrivals
	}
	_, err := b.pool.Exec(ctx, `
		INSERT INTO stats_hourly AS s (site_id, hour, dims_key, kind, path, referrer, channel,
			utm_source, utm_medium, utm_campaign, country, browser, os, device, event_name, hits, arrivals)
		SELECT * FROM unnest($1::bigint[], $2::timestamptz[], $3::bigint[], $4::smallint[], $5::text[],
			$6::text[], $7::text[], $8::text[], $9::text[], $10::text[], $11::text[], $12::text[],
			$13::text[], $14::text[], $15::text[], $16::bigint[], $17::bigint[])
		ON CONFLICT (site_id, hour, dims_key) DO UPDATE
		SET hits = s.hits + EXCLUDED.hits, arrivals = s.arrivals + EXCLUDED.arrivals`,
		site, hour, dkey, kind, path, ref, channel, src, med, camp, country, browser, os, device, event, hits, arrivals)
	return err
}

func (b *Buffer) touchSites(ctx context.Context, seen map[int64]time.Time) error {
	if len(seen) == 0 {
		return nil
	}
	batch := &pgx.Batch{}
	for id, t := range seen {
		batch.Queue(`UPDATE sites SET last_hit_at = GREATEST(COALESCE(last_hit_at, $2), $2),
			first_hit_at = COALESCE(first_hit_at, $2) WHERE id = $1`, id, t)
	}
	return b.pool.SendBatch(ctx, batch).Close()
}

func (b *Buffer) restore(keys []bucketKey, batch map[bucketKey]*counter, seen map[int64]time.Time) {
	b.mu.Lock()
	defer b.mu.Unlock()
	for _, k := range keys {
		c := batch[k]
		if cur, ok := b.pending[k]; ok {
			cur.hits += c.hits
			cur.arrivals += c.arrivals
			continue
		}
		if len(b.pending) >= maxPending {
			b.dropped += c.hits
			continue
		}
		b.pending[k] = c
	}
	for id, t := range seen {
		if t.After(b.seen[id]) {
			b.seen[id] = t
		}
	}
}
