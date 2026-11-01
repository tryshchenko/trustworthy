// Package ingest turns tracking requests into anonymous hourly aggregates.
//
// Data flow:
//
//	HTTP request ─► Collect (validate + sanitize, in memory only)
//	             ─► Buffer.Add (fold into per-hour counters)
//	             ─► Buffer.Flush (batched UPSERT into stats_hourly)
//
// No individual hit is ever written to disk. IP addresses and User-Agent
// strings are only read transiently while handling the request.
package ingest

import (
	"crypto/sha256"
	"encoding/binary"
	"errors"
	"strings"
	"time"

	"github.com/tryshchenko/trustworthy/internal/geo"
	"github.com/tryshchenko/trustworthy/internal/privacy"
)

// Kind distinguishes pageviews from custom events.
type Kind int16

const (
	KindPageview Kind = 1
	KindEvent    Kind = 2
)

// Payload is the JSON body sent by the tracking script. Field names are kept
// short to keep the script small.
type Payload struct {
	URL      string `json:"u"`  // current page URL
	Referrer string `json:"r"`  // document.referrer, or the previous in-app URL for SPA navigations
	Width    int    `json:"w"`  // viewport width in CSS pixels
	TimeZone string `json:"tz"` // Intl time zone, for coarse country
	Event    string `json:"n"`  // custom event name; empty for pageviews
	Domain   string `json:"d"`  // optional explicit site domain (data-domain)
	NavType  string `json:"t"`  // "navigate" | "reload" | "back_forward" | "spa"
}

// Dims are the dimensions an aggregate row is keyed by. All values are
// already sanitized, low-risk labels.
type Dims struct {
	Kind        Kind
	Path        string
	Referrer    string
	Channel     string
	UTMSource   string
	UTMMedium   string
	UTMCampaign string
	Country     string
	Browser     string
	OS          string
	Device      string
	EventName   string
}

// Key returns a stable 64-bit identifier of the dimension tuple.
func (d Dims) Key() int64 {
	h := sha256.New()
	var kb [2]byte
	binary.BigEndian.PutUint16(kb[:], uint16(d.Kind))
	h.Write(kb[:])
	for _, s := range []string{d.Path, d.Referrer, d.Channel, d.UTMSource, d.UTMMedium, d.UTMCampaign, d.Country, d.Browser, d.OS, d.Device, d.EventName} {
		h.Write([]byte(s))
		h.Write([]byte{0})
	}
	sum := h.Sum(nil)
	return int64(binary.BigEndian.Uint64(sum[:8]))
}

// Hit is one sanitized, anonymous measurement ready to be aggregated.
type Hit struct {
	SiteID  int64
	Time    time.Time
	Dims    Dims
	Arrival bool
}

// Site is the subset of site settings the collector needs.
type Site struct {
	ID     int64
	Domain string
}

// SiteResolver maps a page host name to a configured site.
type SiteResolver interface {
	Resolve(host string) (Site, bool)
}

// Request carries the transient, request-scoped inputs. None of these fields
// are retained after Collect returns.
type Request struct {
	Payload     Payload
	UserAgent   string
	CountryCode string // from a trusted edge-proxy header, if configured
	Now         time.Time
}

var (
	ErrBot          = errors.New("automated client")
	ErrBadURL       = errors.New("invalid page url")
	ErrUnknownSite  = errors.New("site not registered")
	ErrHostMismatch = errors.New("page host does not belong to site")
	ErrBadEvent     = errors.New("invalid event name")
)

// Collect validates and sanitizes a tracking request into a Hit.
func Collect(req Request, sites SiteResolver) (Hit, error) {
	p := req.Payload
	if privacy.IsBot(req.UserAgent) {
		return Hit{}, ErrBot
	}
	host, path, campaign, ok := privacy.SanitizeURL(p.URL)
	if !ok {
		return Hit{}, ErrBadURL
	}

	// Pick the site: an explicit data-domain wins, otherwise the page host.
	lookup := host
	if d := privacy.NormalizeHost(p.Domain); d != "" {
		lookup = d
	}
	site, ok := sites.Resolve(lookup)
	if !ok {
		return Hit{}, ErrUnknownSite
	}
	if host != site.Domain && !strings.HasSuffix(host, "."+site.Domain) {
		return Hit{}, ErrHostMismatch
	}

	country := geo.NormalizeCode(req.CountryCode)
	if country == "" {
		country = geo.FromTimeZone(p.TimeZone)
	}
	width := p.Width
	if width < 0 || width > 20000 {
		width = 0
	}
	client := privacy.ParseUserAgent(req.UserAgent, width)

	now := req.Now
	if now.IsZero() {
		now = time.Now()
	}
	hit := Hit{
		SiteID: site.ID,
		Time:   now.UTC(),
		Dims: Dims{
			Path:    path,
			Country: country,
			Browser: client.Browser,
			OS:      client.OS,
			Device:  client.Device,
		},
	}

	if p.Event != "" {
		name := privacy.SanitizeEventName(p.Event)
		if name == "" {
			return Hit{}, ErrBadEvent
		}
		hit.Dims.Kind = KindEvent
		hit.Dims.EventName = name
		return hit, nil
	}

	hit.Dims.Kind = KindPageview
	ref := privacy.ReferrerHost(p.Referrer, host)
	// Referrers from another subdomain of the same site are internal navigation.
	if ref != "" && (ref == site.Domain || strings.HasSuffix(ref, "."+site.Domain)) {
		ref = ""
	}
	internal := ref == "" && isInternalReferrer(p.Referrer, site.Domain)
	// An arrival is a pageview that did not come from another page of this
	// site: an entry from a search engine, a link, a bookmark or a typed URL.
	// Reloads, back/forward navigations and in-app (SPA) navigations are not
	// arrivals. This is a property of a single request; nothing links it to
	// any other request.
	switch {
	case internal, p.NavType == "reload", p.NavType == "back_forward", p.NavType == "spa":
		hit.Arrival = false
	default:
		hit.Arrival = true
	}
	if hit.Arrival {
		// Acquisition dimensions are attributed to the arrival only.
		hit.Dims.Referrer = ref
		hit.Dims.UTMSource = campaign.Source
		hit.Dims.UTMMedium = campaign.Medium
		hit.Dims.UTMCampaign = campaign.Campaign
		hit.Dims.Channel = privacy.Channel(ref, campaign)
	}
	return hit, nil
}

func isInternalReferrer(raw, siteDomain string) bool {
	if raw == "" {
		return false
	}
	h, _, _, ok := privacy.SanitizeURL(raw)
	if !ok {
		return false
	}
	return h == siteDomain || strings.HasSuffix(h, "."+siteDomain)
}
