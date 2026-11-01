package server

import (
	"net/http/httptest"
	"testing"

	"github.com/tryshchenko/trustworthy/internal/config"
)

func TestNormalizeDomain(t *testing.T) {
	ok := map[string]string{
		"example.com":                      "example.com",
		"https://www.Example.com/blog?x=1": "example.com",
		"http://shop.example.co.uk:8080/":  "shop.example.co.uk",
		"localhost":                        "localhost",
	}
	for in, want := range ok {
		if got, err := NormalizeDomain(in); err != nil || got != want {
			t.Errorf("NormalizeDomain(%q) = %q, %v", in, got, err)
		}
	}
	for _, bad := range []string{"", "nodot", "http://", "exa mple.com", "javascript:alert(1)"} {
		if got, err := NormalizeDomain(bad); err == nil {
			t.Errorf("NormalizeDomain(%q) = %q, want error", bad, got)
		}
	}
}

func TestClientIPHonoursProxyOnlyWhenTrusted(t *testing.T) {
	r := httptest.NewRequest("GET", "/", nil)
	r.RemoteAddr = "10.0.0.2:5555"
	r.Header.Set("X-Forwarded-For", "1.1.1.1, 203.0.113.9")
	if ip := (&Server{cfg: config.Config{}}).clientIP(r); ip != "10.0.0.2" {
		t.Fatalf("untrusted: %s", ip)
	}
	if ip := (&Server{cfg: config.Config{TrustProxy: true}}).clientIP(r); ip != "203.0.113.9" {
		t.Fatalf("trusted: %s (must use the right-most, proxy-appended entry)", ip)
	}
}

func TestClientKeyIsSaltedAndOpaque(t *testing.T) {
	r := httptest.NewRequest("GET", "/", nil)
	r.RemoteAddr = "203.0.113.9:1"
	a := &Server{ipSalt: []byte("a")}
	b := &Server{ipSalt: []byte("b")}
	if a.clientKey(r) == b.clientKey(r) {
		t.Fatal("keys must differ across salts (restarts)")
	}
	if len(a.clientKey(r)) != 16 {
		t.Fatal("key must be a truncated hash")
	}
}
