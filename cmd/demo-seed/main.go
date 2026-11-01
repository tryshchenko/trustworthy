// Command demo-seed fills a database with realistic synthetic aggregates for a
// demo site. It is a development tool for screenshots and UI work; never run
// it against a production database.
//
//	DATABASE_URL=... go run ./cmd/demo-seed -domain demo.trustworthy.dev -days 120
package main

import (
	"context"
	"flag"
	"fmt"
	"log/slog"
	"math"
	"math/rand/v2"
	"os"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/tryshchenko/trustworthy/internal/db"
	"github.com/tryshchenko/trustworthy/internal/ingest"
	"github.com/tryshchenko/trustworthy/internal/migrations"
	"github.com/tryshchenko/trustworthy/internal/privacy"
)

type weighted struct {
	v string
	w float64
}

func pick(r *rand.Rand, xs []weighted) string {
	var sum float64
	for _, x := range xs {
		sum += x.w
	}
	n := r.Float64() * sum
	for _, x := range xs {
		if n < x.w {
			return x.v
		}
		n -= x.w
	}
	return xs[len(xs)-1].v
}

var (
	pages = []weighted{{"/", 30}, {"/pricing", 12}, {"/blog/privacy-first-analytics", 9}, {"/docs", 8}, {"/docs/getting-started", 7}, {"/blog/self-hosting-on-a-5-dollar-vps", 6}, {"/features", 6}, {"/about", 3}, {"/changelog", 3}, {"/signup", 4}, {"/blog/why-we-dropped-cookies", 4}, {"/docs/api", 2}, {"/thank-you", 1.5}, {"/careers", 1}}
	refs  = []weighted{{"", 34}, {"google.com", 30}, {"news.ycombinator.com", 8}, {"duckduckgo.com", 6}, {"github.com", 6}, {"reddit.com", 4}, {"x.com", 3}, {"linkedin.com", 2.5}, {"bing.com", 2.5}, {"lobste.rs", 1.5}, {"producthunt.com", 1.5}, {"mail.google.com", 1}}
	ctry  = []weighted{{"US", 28}, {"DE", 14}, {"GB", 9}, {"FR", 6}, {"NL", 5}, {"IN", 6}, {"CA", 4}, {"UA", 3}, {"PL", 3}, {"SE", 2.5}, {"JP", 2.5}, {"BR", 2.5}, {"ES", 2}, {"AU", 2}, {"CH", 1.5}, {"", 2}}
	brs   = []weighted{{"Chrome", 52}, {"Safari", 22}, {"Firefox", 11}, {"Edge", 9}, {"Samsung Internet", 3}, {"Opera", 2}, {"Other", 1}}
	dev   = []weighted{{"Desktop", 58}, {"Mobile", 37}, {"Tablet", 5}}
	evts  = []weighted{{"Signup", 5}, {"Download PDF", 3}, {"Outbound: github.com", 4}, {"Newsletter subscribe", 2}, {"Copy snippet", 3}}
	camps = []privacy.Campaign{{Source: "newsletter", Medium: "email", Campaign: "october-digest"}, {Source: "twitter", Medium: "social", Campaign: "launch-week"}, {Source: "google", Medium: "cpc", Campaign: "brand"}}
)

func osFor(r *rand.Rand, device, browser string) string {
	switch {
	case browser == "Safari" && device != "Desktop":
		return "iOS"
	case browser == "Safari":
		return "macOS"
	case browser == "Samsung Internet" || device == "Mobile" && r.Float64() < 0.7:
		return "Android"
	case device == "Mobile":
		return "iOS"
	case browser == "Edge":
		return "Windows"
	}
	return pick(r, []weighted{{"Windows", 50}, {"macOS", 32}, {"Linux", 14}, {"ChromeOS", 4}})
}

func main() {
	domain := flag.String("domain", "demo.trustworthy.dev", "demo site domain")
	days := flag.Int("days", 120, "days of history")
	scale := flag.Float64("scale", 1, "traffic multiplier")
	flag.Parse()

	ctx := context.Background()
	pool, err := db.Open(ctx, os.Getenv("DATABASE_URL"))
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	defer pool.Close()
	if err := migrations.Run(ctx, pool, slog.Default()); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	store := db.New(pool)
	site, err := store.CreateSite(ctx, db.Site{Domain: *domain, Name: "Trustworthy Demo", Timezone: "Europe/Berlin", RetentionDays: 730, Color: "#1A78E6"})
	if err != nil {
		fmt.Fprintln(os.Stderr, "create site:", err)
		os.Exit(1)
	}

	r := rand.New(rand.NewPCG(42, 7))
	type key struct {
		hour int64
		dk   int64
	}
	agg := map[key]*struct {
		d         ingest.Dims
		hits, arr int64
	}{}
	add := func(t time.Time, d ingest.Dims, arrival bool) {
		k := key{t.Truncate(time.Hour).Unix(), d.Key()}
		c, ok := agg[k]
		if !ok {
			c = &struct {
				d         ingest.Dims
				hits, arr int64
			}{d: d}
			agg[k] = c
		}
		c.hits++
		if arrival {
			c.arr++
		}
	}

	now := time.Now().UTC().Truncate(time.Hour)
	start := now.Add(-time.Duration(*days) * 24 * time.Hour)
	for t := start; !t.After(now); t = t.Add(time.Hour) {
		local := t.In(time.FixedZone("CET", 3600))
		dayIdx := t.Sub(start).Hours() / 24
		growth := 1 + dayIdx/float64(*days)*0.9
		weekday := 1.0
		if wd := local.Weekday(); wd == time.Saturday || wd == time.Sunday {
			weekday = 0.62
		}
		diurnal := 0.25 + 0.75*math.Pow(math.Sin(math.Pi*float64((local.Hour()+18)%24)/24), 2)
		spike := 1.0
		if int(dayIdx) == *days-23 || int(dayIdx) == *days-22 {
			spike = 3.2 // a Hacker News moment
		}
		visits := int(14 * growth * weekday * diurnal * spike * *scale * (0.8 + r.Float64()*0.4))
		for range visits {
			ts := t.Add(time.Duration(r.IntN(3600)) * time.Second)
			device := pick(r, dev)
			browser := pick(r, brs)
			base := ingest.Dims{Country: pick(r, ctry), Browser: browser, OS: osFor(r, device, browser), Device: device}
			ref := pick(r, refs)
			if spike > 1 && r.Float64() < 0.55 {
				ref = "news.ycombinator.com"
			}
			var c privacy.Campaign
			if r.Float64() < 0.08 {
				c = camps[r.IntN(len(camps))]
				if c.Medium != "cpc" {
					ref = ""
				}
			}
			landing := base
			landing.Kind = ingest.KindPageview
			landing.Path = pick(r, pages)
			landing.Referrer, landing.UTMSource, landing.UTMMedium, landing.UTMCampaign = ref, c.Source, c.Medium, c.Campaign
			landing.Channel = privacy.Channel(ref, c)
			add(ts, landing, true)
			depth := 1 + int(r.ExpFloat64()*1.4)
			for i := 0; i < depth && i < 8; i++ {
				pv := base
				pv.Kind = ingest.KindPageview
				pv.Path = pick(r, pages)
				add(ts.Add(time.Duration(i+1)*40*time.Second), pv, false)
			}
			if r.Float64() < 0.11 {
				ev := base
				ev.Kind = ingest.KindEvent
				ev.Path = landing.Path
				ev.EventName = pick(r, evts)
				add(ts, ev, false)
			}
		}
	}

	rows := make([][]any, 0, len(agg))
	for k, c := range agg {
		d := c.d
		rows = append(rows, []any{site.ID, time.Unix(k.hour, 0).UTC(), k.dk, int16(d.Kind), d.Path, d.Referrer, d.Channel, d.UTMSource, d.UTMMedium, d.UTMCampaign, d.Country, d.Browser, d.OS, d.Device, d.EventName, c.hits, c.arr})
	}
	n, err := pool.CopyFrom(ctx, pgx.Identifier{"stats_hourly"},
		[]string{"site_id", "hour", "dims_key", "kind", "path", "referrer", "channel", "utm_source", "utm_medium", "utm_campaign", "country", "browser", "os", "device", "event_name", "hits", "arrivals"},
		pgx.CopyFromRows(rows))
	if err != nil {
		fmt.Fprintln(os.Stderr, "copy:", err)
		os.Exit(1)
	}
	_, _ = pool.Exec(ctx, `UPDATE sites SET first_hit_at = $2, last_hit_at = now() WHERE id = $1`, site.ID, start)
	for _, g := range []db.Goal{{SiteID: site.ID, Name: "Signed up", Kind: "event", Match: "Signup"}, {SiteID: site.ID, Name: "Reached thank-you page", Kind: "page", Match: "/thank-you"}, {SiteID: site.ID, Name: "Read the docs", Kind: "page", Match: "/docs/*"}} {
		_, _ = store.CreateGoal(ctx, g)
	}
	fmt.Printf("seeded site %d (%s): %d aggregate rows\n", site.ID, site.Domain, n)
}
