package config

import (
	"strings"
	"testing"
	"time"
)

func env(m map[string]string) func(string) string { return func(k string) string { return m[k] } }

func TestDefaults(t *testing.T) {
	c, err := load(env(map[string]string{"DATABASE_URL": "postgres://x"}))
	if err != nil {
		t.Fatal(err)
	}
	if c.Addr != ":8080" || c.DefaultRetentionDays != 730 || c.FlushInterval != 5*time.Second || c.SecureCookies != "auto" || c.TrustProxy {
		t.Fatalf("defaults = %+v", c)
	}
}

func TestValidation(t *testing.T) {
	_, err := load(env(map[string]string{
		"ADMIN_EMAIL":            "a@b.co",
		"DEFAULT_RETENTION_DAYS": "-1",
		"FLUSH_INTERVAL":         "1h",
		"SECURE_COOKIES":         "maybe",
		"TRUST_PROXY":            "yes please",
	}))
	if err == nil {
		t.Fatal("expected errors")
	}
	for _, want := range []string{"DATABASE_URL", "ADMIN_EMAIL and ADMIN_PASSWORD", "DEFAULT_RETENTION_DAYS", "FLUSH_INTERVAL", "SECURE_COOKIES", "TRUST_PROXY"} {
		if !strings.Contains(err.Error(), want) {
			t.Errorf("missing error about %s in: %v", want, err)
		}
	}
}

func TestBaseURLTrimmed(t *testing.T) {
	c, _ := load(env(map[string]string{"DATABASE_URL": "x", "BASE_URL": "https://stats.example.com/", "PORT": "9000"}))
	if c.BaseURL != "https://stats.example.com" || c.Addr != ":9000" {
		t.Fatalf("got %+v", c)
	}
	c, _ = load(env(map[string]string{"DATABASE_URL": "x", "BASE_URL": "stats.example.com"}))
	if c.BaseURL != "https://stats.example.com" {
		t.Fatalf("bare host: %q", c.BaseURL)
	}
}
