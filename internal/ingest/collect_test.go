package ingest

import (
	"errors"
	"reflect"
	"strings"
	"testing"
	"time"
)

const chromeMac = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"

type fakeSites map[string]Site

func (f fakeSites) Resolve(host string) (Site, bool) {
	for h := host; h != ""; {
		if s, ok := f[h]; ok {
			return s, true
		}
		i := strings.IndexByte(h, '.')
		if i < 0 {
			break
		}
		h = h[i+1:]
	}
	return Site{}, false
}

var sites = fakeSites{"example.com": {ID: 7, Domain: "example.com"}}

func collect(t *testing.T, p Payload) Hit {
	t.Helper()
	h, err := Collect(Request{Payload: p, UserAgent: chromeMac, Now: time.Date(2026, 3, 1, 10, 30, 0, 0, time.UTC)}, sites)
	if err != nil {
		t.Fatalf("Collect(%+v): %v", p, err)
	}
	return h
}

func TestCollectExternalArrival(t *testing.T) {
	h := collect(t, Payload{
		URL:      "https://www.example.com/pricing?utm_source=Newsletter&utm_medium=email&email=jane@doe.com",
		Referrer: "https://mail.google.com/",
		Width:    1440,
		TimeZone: "Europe/Berlin",
	})
	want := Hit{
		SiteID:  7,
		Time:    time.Date(2026, 3, 1, 10, 30, 0, 0, time.UTC),
		Arrival: true,
		Dims: Dims{
			Kind: KindPageview, Path: "/pricing", Referrer: "mail.google.com", Channel: "Email",
			UTMSource: "newsletter", UTMMedium: "email", Country: "DE",
			Browser: "Chrome", OS: "macOS", Device: "Desktop",
		},
	}
	if !reflect.DeepEqual(h, want) {
		t.Fatalf("got  %+v\nwant %+v", h, want)
	}
}

func TestCollectInternalNavigationIsNotAnArrival(t *testing.T) {
	cases := []Payload{
		{URL: "https://example.com/b", Referrer: "https://example.com"},     // same-site link
		{URL: "https://example.com/b", Referrer: "https://www.example.com"}, // www variant
		{URL: "https://app.example.com/b", Referrer: "https://example.com"}, // subdomain of the site
		{URL: "https://example.com/b", Referrer: "https://google.com", NavType: "reload"},
		{URL: "https://example.com/b", Referrer: "https://google.com", NavType: "back_forward"},
		{URL: "https://example.com/b", Referrer: "https://example.com", NavType: "spa"},
	}
	for _, p := range cases {
		h := collect(t, p)
		if h.Arrival {
			t.Errorf("%+v counted as arrival", p)
		}
		if h.Dims.Referrer != "" || h.Dims.Channel != "" || h.Dims.UTMSource != "" {
			t.Errorf("%+v: acquisition dims must only be set on arrivals: %+v", p, h.Dims)
		}
	}
}

func TestCollectDirectArrival(t *testing.T) {
	h := collect(t, Payload{URL: "https://example.com/"})
	if !h.Arrival || h.Dims.Channel != "Direct" || h.Dims.Referrer != "" {
		t.Fatalf("got %+v", h)
	}
}

func TestCollectCustomEvent(t *testing.T) {
	h := collect(t, Payload{URL: "https://example.com/signup", Event: " Signup  completed ", Referrer: "https://google.com"})
	if h.Dims.Kind != KindEvent || h.Dims.EventName != "Signup completed" || h.Arrival || h.Dims.Referrer != "" {
		t.Fatalf("got %+v", h)
	}
	if _, err := Collect(Request{Payload: Payload{URL: "https://example.com/", Event: "jane@example.com"}, UserAgent: chromeMac}, sites); !errors.Is(err, ErrBadEvent) {
		t.Fatalf("event containing an email must be rejected, got %v", err)
	}
}

func TestCollectRejections(t *testing.T) {
	cases := []struct {
		p    Payload
		ua   string
		want error
	}{
		{Payload{URL: "https://example.com/"}, "curl/8.0", ErrBot},
		{Payload{URL: "https://example.com/"}, "Googlebot/2.1 (+http://www.google.com/bot.html)", ErrBot},
		{Payload{URL: "nope"}, chromeMac, ErrBadURL},
		{Payload{URL: "https://unknown.org/"}, chromeMac, ErrUnknownSite},
		// data-domain cannot be used to inject hits for another host.
		{Payload{URL: "https://attacker.org/", Domain: "example.com"}, chromeMac, ErrHostMismatch},
		// a look-alike domain must not match.
		{Payload{URL: "https://notexample.com/"}, chromeMac, ErrUnknownSite},
	}
	for _, c := range cases {
		if _, err := Collect(Request{Payload: c.p, UserAgent: c.ua}, sites); !errors.Is(err, c.want) {
			t.Errorf("Collect(%+v, %q) err = %v, want %v", c.p, c.ua, err, c.want)
		}
	}
}

func TestCollectCountry(t *testing.T) {
	h, _ := Collect(Request{Payload: Payload{URL: "https://example.com/", TimeZone: "Asia/Tokyo"}, UserAgent: chromeMac}, sites)
	if h.Dims.Country != "JP" {
		t.Errorf("country from time zone = %q", h.Dims.Country)
	}
	h, _ = Collect(Request{Payload: Payload{URL: "https://example.com/", TimeZone: "Asia/Tokyo"}, UserAgent: chromeMac, CountryCode: "nl"}, sites)
	if h.Dims.Country != "NL" {
		t.Errorf("trusted header should win: %q", h.Dims.Country)
	}
	h, _ = Collect(Request{Payload: Payload{URL: "https://example.com/", TimeZone: "Mars/Olympus"}, UserAgent: chromeMac}, sites)
	if h.Dims.Country != "" {
		t.Errorf("unknown zone should give empty country: %q", h.Dims.Country)
	}
}

// The hit must not carry anything derived 1:1 from the request that could
// identify a person: no user agent string, no full referrer, no query.
func TestCollectRetainsNoIdentifyingFields(t *testing.T) {
	ua := chromeMac + " CustomBuild/12345-unique"
	h, err := Collect(Request{
		Payload: Payload{
			URL:      "https://example.com/account/jane.doe@example.com?session=abcdef1234567890",
			Referrer: "https://partner.io/private/path?user=42",
		},
		UserAgent: ua,
	}, sites)
	if err != nil {
		t.Fatal(err)
	}
	dump := strings.ToLower(strings.Join([]string{h.Dims.Path, h.Dims.Referrer, h.Dims.Browser, h.Dims.OS, h.Dims.Device}, "|"))
	for _, leak := range []string{"jane", "session", "abcdef", "private", "user=42", "custombuild", "mozilla"} {
		if strings.Contains(dump, leak) {
			t.Errorf("hit leaks %q: %s", leak, dump)
		}
	}
}

func TestDimsKeyIsStableAndDistinct(t *testing.T) {
	a := Dims{Kind: KindPageview, Path: "/a", Country: "DE"}
	b := Dims{Kind: KindPageview, Path: "/a", Country: "DE"}
	c := Dims{Kind: KindPageview, Path: "/aD", Country: "E"} // must not collide via concatenation
	if a.Key() != b.Key() {
		t.Fatal("equal dims must have equal keys")
	}
	if a.Key() == c.Key() {
		t.Fatal("field boundaries must be part of the key")
	}
	if a.Key() == (Dims{Kind: KindEvent, Path: "/a", Country: "DE"}).Key() {
		t.Fatal("kind must be part of the key")
	}
}
