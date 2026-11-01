// Package config loads runtime configuration from environment variables.
package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

// Config holds every runtime setting. All values come from the environment so
// the binary works unchanged in Docker, Coolify or bare metal.
type Config struct {
	// DatabaseURL is a PostgreSQL connection string (required).
	DatabaseURL string
	// Addr is the listen address, derived from PORT (default 8080).
	Addr string
	// BaseURL is the public URL of this installation, used in tracking snippets.
	// Optional: when empty the dashboard derives it from the browser location.
	BaseURL string

	// AdminEmail / AdminPassword bootstrap (or reset) the owner account on boot.
	AdminEmail    string
	AdminPassword string

	// TrustProxy makes the server honour X-Forwarded-For / X-Forwarded-Proto.
	// Enable it when running behind Coolify's Traefik or another reverse proxy.
	TrustProxy bool
	// CountryHeader optionally names a header set by a trusted edge proxy that
	// already contains an ISO country code (e.g. "CF-IPCountry"). It takes
	// precedence over the time-zone-derived country.
	CountryHeader string

	// DefaultRetentionDays applies to new sites. 0 keeps data forever.
	DefaultRetentionDays int
	// FlushInterval controls how often buffered hits are written to PostgreSQL.
	FlushInterval time.Duration
	// SecureCookies forces the Secure attribute on the session cookie.
	// "auto" (default) sets it when the request arrived over HTTPS.
	SecureCookies string
	// SessionTTL is how long an owner login stays valid.
	SessionTTL time.Duration
	// LogLevel is one of debug, info, warn, error.
	LogLevel string
}

// Load reads the configuration from the process environment.
func Load() (Config, error) { return load(os.Getenv) }

func load(getenv func(string) string) (Config, error) {
	c := Config{
		DatabaseURL:          strings.TrimSpace(getenv("DATABASE_URL")),
		Addr:                 ":" + orDefault(getenv("PORT"), "8080"),
		BaseURL:              strings.TrimRight(strings.TrimSpace(getenv("BASE_URL")), "/"),
		AdminEmail:           strings.TrimSpace(getenv("ADMIN_EMAIL")),
		AdminPassword:        getenv("ADMIN_PASSWORD"),
		CountryHeader:        strings.TrimSpace(getenv("COUNTRY_HEADER")),
		SecureCookies:        strings.ToLower(orDefault(getenv("SECURE_COOKIES"), "auto")),
		LogLevel:             strings.ToLower(orDefault(getenv("LOG_LEVEL"), "info")),
		DefaultRetentionDays: 730,
		FlushInterval:        5 * time.Second,
		SessionTTL:           30 * 24 * time.Hour,
	}
	// Accept a bare host (e.g. Coolify's SERVICE_FQDN_* on some versions).
	if c.BaseURL != "" && !strings.Contains(c.BaseURL, "://") {
		c.BaseURL = "https://" + c.BaseURL
	}
	var errs []error
	if c.DatabaseURL == "" {
		errs = append(errs, errors.New("DATABASE_URL is required"))
	}
	if v := getenv("TRUST_PROXY"); v != "" {
		b, err := strconv.ParseBool(v)
		if err != nil {
			errs = append(errs, fmt.Errorf("TRUST_PROXY: %w", err))
		}
		c.TrustProxy = b
	}
	if v := getenv("DEFAULT_RETENTION_DAYS"); v != "" {
		n, err := strconv.Atoi(v)
		if err != nil || n < 0 {
			errs = append(errs, fmt.Errorf("DEFAULT_RETENTION_DAYS must be a non-negative integer"))
		}
		c.DefaultRetentionDays = n
	}
	if v := getenv("FLUSH_INTERVAL"); v != "" {
		d, err := time.ParseDuration(v)
		if err != nil || d < 100*time.Millisecond || d > time.Minute {
			errs = append(errs, fmt.Errorf("FLUSH_INTERVAL must be a duration between 100ms and 1m"))
		}
		c.FlushInterval = d
	}
	if v := getenv("SESSION_TTL"); v != "" {
		d, err := time.ParseDuration(v)
		if err != nil || d < time.Hour {
			errs = append(errs, fmt.Errorf("SESSION_TTL must be a duration of at least 1h"))
		}
		c.SessionTTL = d
	}
	switch c.SecureCookies {
	case "auto", "true", "false":
	default:
		errs = append(errs, fmt.Errorf("SECURE_COOKIES must be auto, true or false"))
	}
	if (c.AdminEmail == "") != (c.AdminPassword == "") {
		errs = append(errs, errors.New("ADMIN_EMAIL and ADMIN_PASSWORD must be set together"))
	}
	if c.AdminPassword != "" && len(c.AdminPassword) < 10 {
		errs = append(errs, errors.New("ADMIN_PASSWORD must be at least 10 characters"))
	}
	return c, errors.Join(errs...)
}

func orDefault(v, def string) string {
	if strings.TrimSpace(v) == "" {
		return def
	}
	return strings.TrimSpace(v)
}
