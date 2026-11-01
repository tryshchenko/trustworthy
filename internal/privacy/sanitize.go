// Package privacy turns raw, untrusted tracking input into the minimal,
// non-identifying values that are allowed to be stored.
//
// Every function here is deliberately lossy. The rule of thumb: if a value
// could plausibly carry personal data (an e-mail, a token, a user id), it is
// redacted or dropped before it ever reaches memory buffers or the database.
package privacy

import (
	"net/url"
	"regexp"
	"strings"
	"unicode"
	"unicode/utf8"
)

const (
	MaxPathLen     = 300
	MaxHostLen     = 120
	MaxCampaignLen = 80
	MaxEventLen    = 64
	maxSegmentLen  = 64
)

var (
	emailRe = regexp.MustCompile(`(?i)[a-z0-9._%+\-]+(@|%40)[a-z0-9.\-]+\.[a-z]{2,}`)
	uuidRe  = regexp.MustCompile(`(?i)^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$`)
	// Long runs of digits are typically account numbers, order ids or phone numbers.
	longNumberRe = regexp.MustCompile(`^\+?[0-9][0-9\-\s().]{5,}$`)
	hexTokenRe   = regexp.MustCompile(`(?i)^[0-9a-f]{16,}$`)
	// High-entropy tokens: long mixed-case alphanumerics (session ids, JWT parts,
	// reset tokens). Real words and slugs almost always contain separators.
	tokenRe   = regexp.MustCompile(`^[A-Za-z0-9_\-.~=]{24,}$`)
	eventRe   = regexp.MustCompile(`[^\p{L}\p{N} _\-.:/]+`)
	spaceRuns = regexp.MustCompile(`\s+`)
)

// Placeholder used for redacted path segments. Kept short and obviously synthetic.
const Redacted = ":id"

// SanitizeURL parses a page URL reported by the tracking script and returns:
//   - host: the lower-cased hostname without "www."
//   - path: a cleaned path with no query string, fragment or identifiers
//   - campaign: UTM values extracted from the query string (sanitized)
//
// It returns ok=false when the URL is unusable.
func SanitizeURL(raw string) (host, path string, c Campaign, ok bool) {
	if len(raw) > 4096 {
		return "", "", Campaign{}, false
	}
	u, err := url.Parse(strings.TrimSpace(raw))
	if err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Host == "" {
		return "", "", Campaign{}, false
	}
	host = NormalizeHost(u.Hostname())
	if host == "" {
		return "", "", Campaign{}, false
	}
	path = SanitizePath(u.EscapedPath())
	c = CampaignFromQuery(u.Query())
	return host, path, c, true
}

// SanitizePath removes anything that could identify a person from a URL path:
// query strings and fragments are dropped, e-mail addresses, UUIDs, long
// numbers and token-like segments are replaced with ":id".
func SanitizePath(p string) string {
	if i := strings.IndexAny(p, "?#"); i >= 0 {
		p = p[:i]
	}
	if p == "" || p[0] != '/' {
		p = "/" + p
	}
	// Strip ;jsessionid=... style matrix parameters.
	if i := strings.IndexByte(p, ';'); i >= 0 {
		p = p[:i]
	}
	segs := strings.Split(p, "/")
	out := segs[:0]
	for i, s := range segs {
		if i > 0 && s == "" && i != len(segs)-1 {
			continue // collapse "//"
		}
		dec, err := url.PathUnescape(s)
		if err != nil || !utf8.ValidString(dec) {
			dec = s
		}
		if isIdentifier(dec) {
			out = append(out, Redacted)
			continue
		}
		out = append(out, dec)
	}
	p = strings.Join(out, "/")
	if p == "" {
		p = "/"
	}
	// Normalise a trailing slash ("/blog/" and "/blog" are the same page) but keep "/".
	if len(p) > 1 && strings.HasSuffix(p, "/") {
		p = strings.TrimRight(p, "/")
		if p == "" {
			p = "/"
		}
	}
	p = stripControl(p)
	return truncate(p, MaxPathLen)
}

// isIdentifier reports whether a single path segment looks like personal data
// or an opaque identifier.
func isIdentifier(seg string) bool {
	if seg == "" || seg == Redacted {
		return false
	}
	if emailRe.MatchString(seg) || uuidRe.MatchString(seg) || hexTokenRe.MatchString(seg) {
		return true
	}
	if longNumberRe.MatchString(seg) && countDigits(seg) >= 6 {
		return true
	}
	if len(seg) > maxSegmentLen {
		return true
	}
	if tokenRe.MatchString(seg) && looksRandom(seg) {
		return true
	}
	return false
}

// looksRandom distinguishes "kubernetes-deployment-strategies-guide" (a slug)
// from "eyJhbGciOiJIUzI1NiJ9" (a token) by mixing of character classes.
func looksRandom(s string) bool {
	var upper, lower, digit, sep int
	for _, r := range s {
		switch {
		case unicode.IsUpper(r):
			upper++
		case unicode.IsLower(r):
			lower++
		case unicode.IsDigit(r):
			digit++
		default:
			sep++
		}
	}
	classes := 0
	for _, n := range []int{upper, lower, digit} {
		if n > 0 {
			classes++
		}
	}
	// Slugs separate words; tokens rarely do and mix classes heavily.
	return sep <= 1 && classes >= 2 && (digit >= 3 || upper >= 3)
}

func countDigits(s string) int {
	n := 0
	for _, r := range s {
		if r >= '0' && r <= '9' {
			n++
		}
	}
	return n
}

// NormalizeHost lower-cases a hostname, strips the port, a leading "www." and
// a trailing dot. It returns "" for values that are not plausible host names.
func NormalizeHost(h string) string {
	h = strings.ToLower(strings.TrimSpace(h))
	if i := strings.LastIndexByte(h, ':'); i >= 0 && !strings.Contains(h, "]") {
		h = h[:i]
	}
	h = strings.TrimSuffix(h, ".")
	h = strings.TrimPrefix(h, "www.")
	if h == "" || len(h) > MaxHostLen {
		return ""
	}
	for _, r := range h {
		if !(r == '.' || r == '-' || r == '_' || unicode.IsLetter(r) || unicode.IsDigit(r)) {
			return ""
		}
	}
	return h
}

// ReferrerHost reduces a referrer URL to its host name. Only the host is ever
// stored: paths and queries of the previous page are discarded because they
// can contain search terms or personal identifiers.
// Referrers from the tracked site itself (internal navigation) return "".
func ReferrerHost(raw, siteHost string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" || len(raw) > 4096 {
		return ""
	}
	u, err := url.Parse(raw)
	if err != nil {
		return ""
	}
	var host string
	switch u.Scheme {
	case "http", "https":
		host = u.Hostname()
	case "android-app":
		host = u.Host // e.g. com.google.android.gm
	default:
		return ""
	}
	host = NormalizeHost(host)
	if host == "" || host == siteHost {
		return ""
	}
	return host
}

// Campaign holds the UTM parameters that are retained. utm_content and
// utm_term are intentionally ignored: they are often per-recipient.
type Campaign struct {
	Source   string
	Medium   string
	Campaign string
}

// CampaignFromQuery extracts and sanitizes campaign parameters. "ref" and
// "source" are accepted as aliases for utm_source, a common convention.
func CampaignFromQuery(q url.Values) Campaign {
	src := q.Get("utm_source")
	if src == "" {
		src = q.Get("ref")
	}
	if src == "" {
		src = q.Get("source")
	}
	return Campaign{
		Source:   SanitizeCampaignValue(src),
		Medium:   SanitizeCampaignValue(q.Get("utm_medium")),
		Campaign: SanitizeCampaignValue(q.Get("utm_campaign")),
	}
}

// SanitizeCampaignValue lower-cases and trims a UTM value, and drops it
// entirely when it looks like it contains personal data.
func SanitizeCampaignValue(v string) string {
	v = strings.ToLower(strings.TrimSpace(stripControl(v)))
	v = spaceRuns.ReplaceAllString(v, " ")
	if v == "" {
		return ""
	}
	if emailRe.MatchString(v) || strings.ContainsAny(v, "@<>\"'") {
		return ""
	}
	for _, f := range strings.FieldsFunc(v, func(r rune) bool { return r == ' ' || r == '/' || r == '|' }) {
		if isIdentifier(f) {
			return ""
		}
	}
	return truncate(v, MaxCampaignLen)
}

// SanitizeEventName restricts custom event names to a conservative character
// set and length. Event names are labels chosen by the site owner; anything
// that looks like personal data is rejected.
func SanitizeEventName(v string) string {
	v = strings.TrimSpace(stripControl(v))
	if v == "" || emailRe.MatchString(v) {
		return ""
	}
	v = eventRe.ReplaceAllString(v, "")
	v = strings.TrimSpace(spaceRuns.ReplaceAllString(v, " "))
	if v == "" {
		return ""
	}
	for _, f := range strings.Fields(v) {
		if isIdentifier(f) {
			return ""
		}
	}
	return truncate(v, MaxEventLen)
}

func stripControl(s string) string {
	return strings.Map(func(r rune) rune {
		if unicode.IsControl(r) {
			return -1
		}
		return r
	}, s)
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	// Cut on a rune boundary.
	for n > 0 && !utf8.RuneStart(s[n]) {
		n--
	}
	return s[:n]
}
