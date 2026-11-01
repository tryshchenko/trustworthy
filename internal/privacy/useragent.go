package privacy

import (
	"regexp"
	"strings"
)

// Client is the coarse, non-identifying classification derived from a
// User-Agent header. The header itself is never stored or logged; only these
// three low-cardinality labels survive.
type Client struct {
	Browser string
	OS      string
	Device  string
}

var botRe = regexp.MustCompile(`(?i)bot\b|bot/|crawl|spider|slurp|scrap|headless|lighthouse|pagespeed|pingdom|uptime|monitor|statuscake|curl/|wget/|python|go-http-client|java/|okhttp|httpclient|axios/|node-fetch|undici|phantomjs|selenium|puppeteer|playwright|facebookexternalhit|embedly|preview|validator|feedfetcher|mediapartners|bingpreview|chrome-lighthouse|gtmetrix|prerender`)

// IsBot reports whether a User-Agent belongs to an automated client.
func IsBot(ua string) bool {
	ua = strings.TrimSpace(ua)
	if len(ua) < 12 {
		return true
	}
	return botRe.MatchString(ua)
}

// ParseUserAgent classifies a User-Agent into browser and OS families.
// width is the viewport width reported by the tracking script (0 if unknown)
// and is used to pick the device class, falling back to UA hints.
func ParseUserAgent(ua string, width int) Client {
	return Client{
		Browser: browserFamily(ua),
		OS:      osFamily(ua),
		Device:  deviceClass(ua, width),
	}
}

func browserFamily(ua string) string {
	has := func(s string) bool { return strings.Contains(ua, s) }
	switch {
	case has("FBAN") || has("FBAV") || has("FB_IAB"):
		return "Facebook"
	case has("Instagram"):
		return "Instagram"
	case has("Edg/") || has("EdgA/") || has("EdgiOS/") || has("Edge/"):
		return "Edge"
	case has("OPR/") || has("Opera") || has("OPX/"):
		return "Opera"
	case has("SamsungBrowser/"):
		return "Samsung Internet"
	case has("YaBrowser/"):
		return "Yandex"
	case has("UCBrowser/"):
		return "UC Browser"
	case has("DuckDuckGo/"):
		return "DuckDuckGo"
	case has("Firefox/") || has("FxiOS/"):
		return "Firefox"
	case has("CriOS/") || has("Chrome/") || has("Chromium/"):
		return "Chrome"
	case has("Safari/") && (has("Version/") || has("iPhone") || has("iPad") || has("Macintosh")):
		return "Safari"
	case has("Trident/") || has("MSIE "):
		return "Internet Explorer"
	}
	return "Other"
}

func osFamily(ua string) string {
	has := func(s string) bool { return strings.Contains(ua, s) }
	switch {
	case has("Windows NT") || has("Windows Phone"):
		return "Windows"
	case has("iPhone") || has("iPad") || has("iPod"):
		return "iOS"
	case has("Android"):
		return "Android"
	case has("CrOS"):
		return "ChromeOS"
	case has("Macintosh") || has("Mac OS X"):
		return "macOS"
	case has("Linux") || has("X11"):
		return "Linux"
	}
	return "Other"
}

func deviceClass(ua string, width int) string {
	if width > 0 {
		switch {
		case width < 768:
			return "Mobile"
		case width < 1024:
			return "Tablet"
		default:
			return "Desktop"
		}
	}
	switch {
	case strings.Contains(ua, "iPad") || strings.Contains(ua, "Tablet"):
		return "Tablet"
	case strings.Contains(ua, "Mobi") || strings.Contains(ua, "iPhone"):
		return "Mobile"
	}
	return "Desktop"
}
