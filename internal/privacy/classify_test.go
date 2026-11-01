package privacy

import "testing"

const (
	uaChromeMac   = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
	uaSafariIOS   = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
	uaFirefoxWin  = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0"
	uaEdgeWin     = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0"
	uaSamsung     = "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36"
	uaChromeIPad  = "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.0.0 Mobile/15E148 Safari/604.1"
	uaFirefoxLinx = "Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0"
)

func TestParseUserAgent(t *testing.T) {
	cases := []struct {
		ua    string
		width int
		want  Client
	}{
		{uaChromeMac, 1440, Client{"Chrome", "macOS", "Desktop"}},
		{uaSafariIOS, 390, Client{"Safari", "iOS", "Mobile"}},
		{uaFirefoxWin, 0, Client{"Firefox", "Windows", "Desktop"}},
		{uaEdgeWin, 1280, Client{"Edge", "Windows", "Desktop"}},
		{uaSamsung, 412, Client{"Samsung Internet", "Android", "Mobile"}},
		{uaChromeIPad, 820, Client{"Chrome", "iOS", "Tablet"}},
		{uaChromeIPad, 0, Client{"Chrome", "iOS", "Tablet"}},
		{uaSafariIOS, 0, Client{"Safari", "iOS", "Mobile"}},
		{uaFirefoxLinx, 1920, Client{"Firefox", "Linux", "Desktop"}},
	}
	for _, c := range cases {
		if got := ParseUserAgent(c.ua, c.width); got != c.want {
			t.Errorf("ParseUserAgent(%q, %d) = %+v, want %+v", c.ua, c.width, got, c.want)
		}
	}
}

func TestIsBot(t *testing.T) {
	bots := []string{
		"",
		"curl/8.4.0",
		"Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
		"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120.0.0.0 Safari/537.36",
		"Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Mobile Safari/537.36 Chrome-Lighthouse",
		"facebookexternalhit/1.1",
		"python-requests/2.31",
		"Go-http-client/1.1",
	}
	for _, ua := range bots {
		if !IsBot(ua) {
			t.Errorf("IsBot(%q) = false", ua)
		}
	}
	for _, ua := range []string{uaChromeMac, uaSafariIOS, uaFirefoxWin, uaEdgeWin, uaSamsung} {
		if IsBot(ua) {
			t.Errorf("IsBot(%q) = true", ua)
		}
	}
}

func TestChannel(t *testing.T) {
	cases := []struct {
		ref  string
		c    Campaign
		want string
	}{
		{"", Campaign{}, ChannelDirect},
		{"google.com", Campaign{}, ChannelSearch},
		{"google.co.uk", Campaign{}, ChannelSearch},
		{"duckduckgo.com", Campaign{}, ChannelSearch},
		{"news.ycombinator.com", Campaign{}, ChannelSocial},
		{"t.co", Campaign{}, ChannelSocial},
		{"mail.google.com", Campaign{}, ChannelEmail},
		{"someblog.dev", Campaign{}, ChannelReferral},
		{"", Campaign{Source: "newsletter", Medium: "email"}, ChannelEmail},
		{"google.com", Campaign{Source: "google", Medium: "cpc"}, ChannelPaid},
		{"", Campaign{Source: "podcast"}, ChannelCampaign},
		{"notgoogle.com", Campaign{}, ChannelReferral},
	}
	for _, c := range cases {
		if got := Channel(c.ref, c.c); got != c.want {
			t.Errorf("Channel(%q, %+v) = %q, want %q", c.ref, c.c, got, c.want)
		}
	}
}
