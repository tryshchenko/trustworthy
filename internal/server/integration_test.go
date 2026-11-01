package server

// End-to-end tests against a real PostgreSQL. They are skipped unless
// TEST_DATABASE_URL points at a disposable database, e.g.:
//
//	docker run --rm -d -p 55432:5432 -e POSTGRES_PASSWORD=test postgres:17-alpine
//	TEST_DATABASE_URL=postgres://postgres:test@localhost:55432/postgres?sslmode=disable go test ./...
//
// WARNING: the tests drop and recreate the public schema of that database.

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/cookiejar"
	"net/http/httptest"
	"os"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/tryshchenko/trustworthy/internal/config"
	"github.com/tryshchenko/trustworthy/internal/db"
	"github.com/tryshchenko/trustworthy/internal/ingest"
	"github.com/tryshchenko/trustworthy/internal/migrations"
	"github.com/tryshchenko/trustworthy/internal/stats"
)

const (
	testUA    = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 UniqueBuild/987654"
	testIP    = "203.0.113.77"
	setupCode = "ABCD-EFGH-JKLM"
)

type env struct {
	t      *testing.T
	pool   *pgxpool.Pool
	srv    *Server
	buffer *ingest.Buffer
	http   *httptest.Server
	client *http.Client
}

func newEnv(t *testing.T) *env {
	t.Helper()
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL not set")
	}
	ctx := context.Background()
	pool, err := db.Open(ctx, url)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(pool.Close)
	if _, err := pool.Exec(ctx, `DROP SCHEMA public CASCADE; CREATE SCHEMA public`); err != nil {
		t.Fatal(err)
	}
	log := slog.New(slog.NewTextHandler(io.Discard, nil))
	if err := migrations.Run(ctx, pool, log); err != nil {
		t.Fatal(err)
	}
	// Running migrations twice must be a no-op.
	if err := migrations.Run(ctx, pool, log); err != nil {
		t.Fatal(err)
	}
	rt := ingest.NewRealtime()
	buf := ingest.NewBuffer(pool, rt, log)
	cfg := config.Config{TrustProxy: true, SecureCookies: "auto", SessionTTL: time.Hour, DefaultRetentionDays: 365}
	s := New(Options{Config: cfg, Logger: log, Store: db.New(pool), Stats: &stats.Service{Pool: pool}, Buffer: buf, Realtime: rt, Version: "test"})
	if err := s.Init(ctx); err != nil {
		t.Fatal(err)
	}
	s.SetSetupCode(setupCode)
	hs := httptest.NewServer(s.Handler())
	t.Cleanup(hs.Close)
	jar, _ := cookiejar.New(nil)
	return &env{t: t, pool: pool, srv: s, buffer: buf, http: hs, client: &http.Client{Jar: jar}}
}

func (e *env) do(method, path string, body any, headers ...string) (*http.Response, []byte) {
	e.t.Helper()
	var r io.Reader
	if body != nil {
		b, _ := json.Marshal(body)
		r = bytes.NewReader(b)
	}
	req, _ := http.NewRequest(method, e.http.URL+path, r)
	req.Header.Set("Content-Type", "application/json")
	for i := 0; i+1 < len(headers); i += 2 {
		req.Header.Set(headers[i], headers[i+1])
	}
	resp, err := e.client.Do(req)
	if err != nil {
		e.t.Fatal(err)
	}
	defer resp.Body.Close()
	out, _ := io.ReadAll(resp.Body)
	return resp, out
}

func (e *env) expect(status int, method, path string, body any, headers ...string) []byte {
	e.t.Helper()
	resp, out := e.do(method, path, body, headers...)
	if resp.StatusCode != status {
		e.t.Fatalf("%s %s: status %d, want %d: %s", method, path, resp.StatusCode, status, out)
	}
	return out
}

func (e *env) hit(p ingest.Payload) int {
	e.t.Helper()
	b, _ := json.Marshal(p)
	req, _ := http.NewRequest("POST", e.http.URL+"/api/event", bytes.NewReader(b))
	req.Header.Set("Content-Type", "text/plain")
	req.Header.Set("User-Agent", testUA)
	req.Header.Set("X-Forwarded-For", testIP)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		e.t.Fatal(err)
	}
	resp.Body.Close()
	return resp.StatusCode
}

func (e *env) login() {
	e.expect(200, "POST", "/api/setup", map[string]string{"email": "owner@example.org", "password": "correct horse battery", "setupCode": setupCode})
}

func TestSetupAndAuth(t *testing.T) {
	e := newEnv(t)
	var sess sessionResponse
	_ = json.Unmarshal(e.expect(200, "GET", "/api/session", nil), &sess)
	if !sess.SetupRequired || sess.Authenticated {
		t.Fatalf("session = %+v", sess)
	}
	e.expect(401, "GET", "/api/sites", nil)
	e.expect(403, "POST", "/api/setup", map[string]string{"email": "a@b.co", "password": "long enough pw", "setupCode": "WRONG"})
	e.expect(400, "POST", "/api/setup", map[string]string{"email": "a@b.co", "password": "short", "setupCode": setupCode})
	e.login()
	e.expect(409, "POST", "/api/setup", map[string]string{"email": "x@y.co", "password": "another password", "setupCode": setupCode})

	_ = json.Unmarshal(e.expect(200, "GET", "/api/session", nil), &sess)
	if !sess.Authenticated || sess.Email != "owner@example.org" {
		t.Fatalf("session = %+v", sess)
	}
	// The session token itself is never stored, only its hash.
	var stored []byte
	if err := e.pool.QueryRow(context.Background(), `SELECT token_hash FROM sessions`).Scan(&stored); err != nil || len(stored) != 32 {
		t.Fatalf("session hash: %v %d", err, len(stored))
	}

	e.expect(200, "POST", "/api/logout", nil)
	e.expect(401, "GET", "/api/sites", nil)
	e.expect(401, "POST", "/api/login", map[string]string{"email": "owner@example.org", "password": "wrong password!"})
	e.expect(200, "POST", "/api/login", map[string]string{"email": "Owner@Example.org", "password": "correct horse battery"})
	e.expect(200, "GET", "/api/sites", nil)
}

func TestCSRFProtection(t *testing.T) {
	e := newEnv(t)
	e.login()
	e.expect(403, "POST", "/api/sites", map[string]string{"domain": "evil.test"}, "Origin", "https://evil.example")
	e.expect(403, "POST", "/api/sites", map[string]string{"domain": "evil.test"}, "Sec-Fetch-Site", "cross-site")
	e.expect(201, "POST", "/api/sites", map[string]string{"domain": "good.test"}, "Origin", e.http.URL)
}

func TestCollectAggregateAndQuery(t *testing.T) {
	e := newEnv(t)
	e.login()
	var site db.Site
	_ = json.Unmarshal(e.expect(201, "POST", "/api/sites", map[string]any{"domain": "https://www.Example.com/", "name": "Example", "timezone": "UTC"}), &site)
	if site.Domain != "example.com" {
		t.Fatalf("domain = %q", site.Domain)
	}
	e.expect(409, "POST", "/api/sites", map[string]any{"domain": "example.com"})

	// Traffic: 3 arrivals (google, newsletter campaign, direct), 2 internal
	// pageviews, 1 reload, 1 custom event, plus noise that must be ignored.
	pv := func(p ingest.Payload) {
		t.Helper()
		if code := e.hit(p); code != http.StatusAccepted {
			t.Fatalf("hit %+v: status %d", p, code)
		}
	}
	pv(ingest.Payload{URL: "https://example.com/?utm_source=x&email=jane.doe@mail.com", Referrer: "https://www.google.com", Width: 1400, TimeZone: "Europe/Paris"})
	pv(ingest.Payload{URL: "https://example.com/pricing?utm_source=newsletter&utm_medium=email&utm_campaign=launch", Width: 390, TimeZone: "America/New_York"})
	pv(ingest.Payload{URL: "https://example.com/blog/hello", Width: 1400, TimeZone: "Europe/Paris"})
	pv(ingest.Payload{URL: "https://example.com/pricing", Referrer: "https://example.com", Width: 1400, TimeZone: "Europe/Paris"})
	pv(ingest.Payload{URL: "https://example.com/users/jane.doe@mail.com/profile", Referrer: "https://example.com", TimeZone: "Europe/Paris"})
	pv(ingest.Payload{URL: "https://example.com/blog/hello", Referrer: "https://google.com", NavType: "reload"})
	pv(ingest.Payload{URL: "https://example.com/pricing", Event: "Signup", TimeZone: "Europe/Paris"})

	if code := e.hit(ingest.Payload{URL: "https://unknown.test/"}); code != http.StatusNotFound {
		t.Fatalf("unknown site status %d", code)
	}
	if code := e.hit(ingest.Payload{URL: "https://attacker.test/", Domain: "example.com"}); code != http.StatusBadRequest {
		t.Fatalf("host mismatch status %d", code)
	}

	// Two flushes with the same key must add up, not overwrite.
	if err := e.buffer.Flush(context.Background()); err != nil {
		t.Fatal(err)
	}
	pv(ingest.Payload{URL: "https://example.com/blog/hello", Referrer: "https://example.com", Width: 1400, TimeZone: "Europe/Paris"})
	if err := e.buffer.Flush(context.Background()); err != nil {
		t.Fatal(err)
	}

	base := "/api/sites/" + itoa(site.ID)
	var ov overviewResponse
	_ = json.Unmarshal(e.expect(200, "GET", base+"/overview?compare=previous", nil), &ov)
	if ov.Totals != (stats.Totals{Pageviews: 7, Visits: 3, Events: 1}) {
		t.Fatalf("totals = %+v", ov.Totals)
	}
	if ov.CompareTotals == nil || ov.CompareTotals.Pageviews != 0 || len(ov.Series) != 30 || len(ov.CompareSeries) != 30 {
		t.Fatalf("comparison missing: %+v", ov)
	}
	var sum int64
	for _, p := range ov.Series {
		sum += p.Pageviews
	}
	if sum != 7 {
		t.Fatalf("series sum = %d", sum)
	}

	breakdown := func(q string) stats.Breakdown {
		t.Helper()
		var b stats.Breakdown
		_ = json.Unmarshal(e.expect(200, "GET", base+"/breakdown?"+q, nil), &b)
		return b
	}
	pages := breakdown("dim=page")
	if pages.Total != 7 || pages.Rows[0].Value != "/blog/hello" || pages.Rows[0].Pageviews != 3 {
		t.Fatalf("pages = %+v", pages)
	}
	for _, r := range pages.Rows {
		if strings.Contains(r.Value, "jane") {
			t.Fatalf("personal data in path: %q", r.Value)
		}
	}
	landing := breakdown("dim=landing")
	if len(landing.Rows) != 3 {
		t.Fatalf("landing = %+v", landing)
	}
	if ch := breakdown("dim=channel"); len(ch.Rows) != 3 || ch.Total != 3 {
		t.Fatalf("channels = %+v", ch)
	}
	if ref := breakdown("dim=referrer"); len(ref.Rows) != 1 || ref.Rows[0].Value != "google.com" {
		t.Fatalf("referrers = %+v", ref)
	}
	if c := breakdown("dim=utm_campaign"); len(c.Rows) != 1 || c.Rows[0].Value != "launch" {
		t.Fatalf("campaigns = %+v", c)
	}
	if c := breakdown("dim=country"); c.Rows[0].Value != "FR" {
		t.Fatalf("countries = %+v", c)
	}
	if d := breakdown("dim=device"); len(d.Rows) != 2 {
		t.Fatalf("devices = %+v", d)
	}
	if ev := breakdown("dim=event"); len(ev.Rows) != 1 || ev.Rows[0].Value != "Signup" || ev.Rows[0].Events != 1 {
		t.Fatalf("events = %+v", ev)
	}
	if s := breakdown("dim=page&q=blog"); len(s.Rows) != 1 {
		t.Fatalf("search = %+v", s)
	}
	// Filters narrow every metric.
	_ = json.Unmarshal(e.expect(200, "GET", base+"/overview?filter=country:US", nil), &ov)
	if ov.Totals.Pageviews != 1 || ov.Totals.Visits != 1 {
		t.Fatalf("filtered totals = %+v", ov.Totals)
	}
	e.expect(400, "GET", base+"/overview?filter=event:Signup", nil)
	e.expect(400, "GET", base+"/breakdown?dim=ip", nil)

	// Goals.
	e.expect(201, "POST", base+"/goals", map[string]string{"name": "Signed up", "kind": "event", "match": "Signup"})
	e.expect(201, "POST", base+"/goals", map[string]string{"name": "Read blog", "kind": "page", "match": "/blog/*"})
	e.expect(400, "POST", base+"/goals", map[string]string{"kind": "page", "match": ""})
	var gs struct {
		Visits int64      `json:"visits"`
		Goals  []goalStat `json:"goals"`
	}
	_ = json.Unmarshal(e.expect(200, "GET", base+"/goal-stats", nil), &gs)
	if gs.Visits != 3 || len(gs.Goals) != 2 || gs.Goals[0].Completions != 1 || gs.Goals[1].Completions != 3 {
		t.Fatalf("goal stats = %+v", gs)
	}

	// Realtime sees the same traffic.
	var rt ingest.Snapshot
	_ = json.Unmarshal(e.expect(200, "GET", base+"/realtime", nil), &rt)
	if rt.Pageviews != 7 || rt.Events != 1 {
		t.Fatalf("realtime = %+v", rt)
	}

	// Export.
	csv := string(e.expect(200, "GET", base+"/export", nil))
	if !strings.HasPrefix(csv, "date,type,page,referrer") || !strings.Contains(csv, "/blog/hello") {
		t.Fatalf("csv = %s", csv)
	}

	assertNoPersonalData(t, e.pool)
}

// assertNoPersonalData dumps every row of every table as text and checks that
// none of the request's identifying inputs were persisted.
func assertNoPersonalData(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()
	ctx := context.Background()
	rows, err := pool.Query(ctx, `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`)
	if err != nil {
		t.Fatal(err)
	}
	var tables []string
	for rows.Next() {
		var n string
		_ = rows.Scan(&n)
		tables = append(tables, n)
	}
	rows.Close()
	var dump strings.Builder
	for _, tbl := range tables {
		rows, err := pool.Query(ctx, `SELECT row_to_json(t)::text FROM "`+tbl+`" t`)
		if err != nil {
			t.Fatal(err)
		}
		for rows.Next() {
			var s string
			_ = rows.Scan(&s)
			dump.WriteString(s)
			dump.WriteByte('\n')
		}
		rows.Close()
	}
	all := strings.ToLower(dump.String())
	for _, leak := range []string{testIP, "203.0.113", "uniquebuild", "mozilla", "applewebkit", "jane", "mail.com", "europe/paris", "america/new_york"} {
		if strings.Contains(all, leak) {
			t.Errorf("database contains %q", leak)
		}
	}
	if !strings.Contains(all, "/blog/hello") {
		t.Fatal("sanity check: expected aggregates in the dump")
	}
}

func TestRetentionPurge(t *testing.T) {
	e := newEnv(t)
	e.login()
	var site db.Site
	_ = json.Unmarshal(e.expect(201, "POST", "/api/sites", map[string]any{"domain": "old.test", "retentionDays": 30}), &site)
	ctx := context.Background()
	for _, age := range []time.Duration{90 * 24 * time.Hour, 2 * time.Hour} {
		_, err := e.pool.Exec(ctx, `INSERT INTO stats_hourly (site_id, hour, dims_key, kind, path, hits) VALUES ($1, $2, $3, 1, '/', 1)`,
			site.ID, time.Now().Add(-age).Truncate(time.Hour), int64(age))
		if err != nil {
			t.Fatal(err)
		}
	}
	n, err := db.New(e.pool).PurgeExpired(ctx)
	if err != nil || n != 1 {
		t.Fatalf("purged %d, err %v", n, err)
	}
	// Deleting the site removes its aggregates too.
	e.expect(200, "DELETE", "/api/sites/"+itoa(site.ID), nil)
	var left int
	_ = e.pool.QueryRow(ctx, `SELECT count(*) FROM stats_hourly`).Scan(&left)
	if left != 0 {
		t.Fatalf("%d rows left after delete", left)
	}
}

func itoa(n int64) string { return strconv.FormatInt(n, 10) }
