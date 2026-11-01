package privacy

import (
	"net/url"
	"strings"
	"testing"
)

func TestSanitizePathRemovesPersonalData(t *testing.T) {
	cases := map[string]string{
		"/":         "/",
		"":          "/",
		"/pricing":  "/pricing",
		"/pricing/": "/pricing",
		"/blog/how-we-built-a-privacy-first-tool":         "/blog/how-we-built-a-privacy-first-tool",
		"/docs?token=abc#section":                         "/docs",
		"/users/jane.doe@example.com/settings":            "/users/:id/settings",
		"/users/jane.doe%40example.com":                   "/users/:id",
		"/orders/550e8400-e29b-41d4-a716-446655440000":    "/orders/:id",
		"/account/1234567/invoices":                       "/account/:id/invoices",
		"/reset/eyJhbGciOiJIUzI1NiJ9AbCdEf12345":          "/reset/:id",
		"/files/9f86d081884c7d659a2feaa0c55ad015":         "/files/:id",
		"/archive/2024/05":                                "/archive/2024/05",
		"/a//b":                                           "/a/b",
		"/page;jsessionid=ABC123":                         "/page",
		"/call/+49-170-1234567":                           "/call/:id",
		"/caf%C3%A9":                                      "/café",
		"/Kubernetes-Deployment-Strategies-For-Beginners": "/Kubernetes-Deployment-Strategies-For-Beginners",
	}
	for in, want := range cases {
		if got := SanitizePath(in); got != want {
			t.Errorf("SanitizePath(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestSanitizePathBoundsLength(t *testing.T) {
	long := "/" + strings.Repeat("section-", 100)
	if got := SanitizePath(long); len(got) > MaxPathLen {
		t.Fatalf("path not truncated: %d bytes", len(got))
	}
}

func TestSanitizeURL(t *testing.T) {
	host, path, c, ok := SanitizeURL("https://WWW.Example.com:443/landing/?utm_source=Newsletter&utm_medium=email&utm_campaign=Spring+Sale&email=jane@example.com&utm_content=user-123")
	if !ok {
		t.Fatal("expected ok")
	}
	if host != "example.com" || path != "/landing" {
		t.Fatalf("got host=%q path=%q", host, path)
	}
	if c.Source != "newsletter" || c.Medium != "email" || c.Campaign != "spring sale" {
		t.Fatalf("campaign = %+v", c)
	}
	for _, bad := range []string{"", "javascript:alert(1)", "ftp://example.com/x", "/relative", "https://", "https://exa mple.com/"} {
		if _, _, _, ok := SanitizeURL(bad); ok {
			t.Errorf("SanitizeURL(%q) should fail", bad)
		}
	}
}

func TestCampaignValuesWithPersonalDataAreDropped(t *testing.T) {
	for _, v := range []string{"jane@example.com", "user jane.doe@example.com", "<script>", "550e8400-e29b-41d4-a716-446655440000", "a1B2c3D4e5F6g7H8i9J0k1L2m3"} {
		if got := SanitizeCampaignValue(v); got != "" {
			t.Errorf("SanitizeCampaignValue(%q) = %q, want empty", v, got)
		}
	}
	if got := SanitizeCampaignValue("  Black  Friday 2025 "); got != "black friday 2025" {
		t.Errorf("got %q", got)
	}
	q, _ := url.ParseQuery("ref=producthunt")
	if c := CampaignFromQuery(q); c.Source != "producthunt" {
		t.Errorf("ref alias not used: %+v", c)
	}
}

func TestReferrerHostKeepsOnlyHost(t *testing.T) {
	cases := []struct{ ref, site, want string }{
		{"https://www.google.com/search?q=jane+doe+address", "example.com", "google.com"},
		{"https://news.ycombinator.com/item?id=1", "example.com", "news.ycombinator.com"},
		{"https://example.com/pricing", "example.com", ""},
		{"android-app://com.google.android.gm/", "example.com", "com.google.android.gm"},
		{"", "example.com", ""},
		{"not a url", "example.com", ""},
		{"file:///etc/passwd", "example.com", ""},
	}
	for _, c := range cases {
		if got := ReferrerHost(c.ref, c.site); got != c.want {
			t.Errorf("ReferrerHost(%q) = %q, want %q", c.ref, got, c.want)
		}
	}
}

func TestSanitizeEventName(t *testing.T) {
	cases := map[string]string{
		"Signup":                     "Signup",
		"  Download   PDF ":          "Download PDF",
		"checkout:completed":         "checkout:completed",
		"Outbound: github.com":       "Outbound: github.com",
		"<img src=x onerror=1>":      "img srcx onerror1",
		"jane@example.com":           "",
		"order 550e8400e29b41d4a7":   "",
		strings.Repeat("x", 200):     "", // one unbroken 200-char blob looks like a token
		strings.Repeat("Click ", 20): strings.TrimSpace(strings.Repeat("Click ", 11))[:MaxEventLen],
	}
	for in, want := range cases {
		if got := SanitizeEventName(in); got != want {
			t.Errorf("SanitizeEventName(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestNormalizeHost(t *testing.T) {
	cases := map[string]string{
		"Example.COM":            "example.com",
		"www.example.com":        "example.com",
		"example.com.":           "example.com",
		"example.com:8080":       "example.com",
		"bad host":               "",
		"evil.com/<script>":      "",
		strings.Repeat("a", 300): "",
	}
	for in, want := range cases {
		if got := NormalizeHost(in); got != want {
			t.Errorf("NormalizeHost(%q) = %q, want %q", in, got, want)
		}
	}
}
