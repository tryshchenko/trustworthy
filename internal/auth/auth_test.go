package auth

import (
	"bytes"
	"testing"
	"time"
)

func TestPasswords(t *testing.T) {
	if _, err := HashPassword("short"); err == nil {
		t.Fatal("short password accepted")
	}
	h, err := HashPassword("correct horse battery")
	if err != nil {
		t.Fatal(err)
	}
	if !CheckPassword(h, "correct horse battery") || CheckPassword(h, "wrong horse battery") {
		t.Fatal("password check broken")
	}
	if CheckPasswordOrDummy("", "anything") {
		t.Fatal("missing owner must never authenticate")
	}
}

func TestTokensAreRandomAndOnlyHashesAreComparable(t *testing.T) {
	a, ha := NewToken()
	b, hb := NewToken()
	if a == b || bytes.Equal(ha, hb) || len(a) < 40 {
		t.Fatal("tokens must be unique and long")
	}
	if !bytes.Equal(HashToken(a), ha) {
		t.Fatal("hash must be deterministic")
	}
}

func TestSetupCode(t *testing.T) {
	c := NewSetupCode()
	if len(c) != 14 {
		t.Fatalf("code %q", c)
	}
	if !SetupCodeMatches(c, " "+lower(c)+" ") || !SetupCodeMatches(c, removeDashes(c)) {
		t.Fatal("matching should ignore case, spaces and dashes")
	}
	if SetupCodeMatches(c, "") || SetupCodeMatches("", "") || SetupCodeMatches(c, "AAAA-BBBB-CCCC") {
		t.Fatal("wrong codes must not match")
	}
}

func TestNormalizeEmail(t *testing.T) {
	if e, err := NormalizeEmail(" Owner@Example.ORG "); err != nil || e != "owner@example.org" {
		t.Fatalf("got %q %v", e, err)
	}
	for _, bad := range []string{"", "nope", "a@", "Name <a@b.co>"} {
		if _, err := NormalizeEmail(bad); err == nil {
			t.Errorf("%q accepted", bad)
		}
	}
}

func TestLimiter(t *testing.T) {
	now := time.Unix(0, 0)
	l := NewLimiter(3, time.Minute)
	l.now = func() time.Time { return now }
	for i := 0; i < 3; i++ {
		if !l.Allow("k") {
			t.Fatalf("attempt %d blocked", i)
		}
	}
	if l.Allow("k") || !l.Blocked("k") {
		t.Fatal("4th attempt should be blocked")
	}
	if !l.Allow("other") {
		t.Fatal("keys are independent")
	}
	now = now.Add(time.Minute)
	if !l.Allow("k") {
		t.Fatal("window should reset")
	}
	l.Sweep()
}

func lower(s string) string {
	b := []byte(s)
	for i, c := range b {
		if c >= 'A' && c <= 'Z' {
			b[i] = c + 32
		}
	}
	return string(b)
}

func removeDashes(s string) string { return string(bytes.ReplaceAll([]byte(s), []byte("-"), nil)) }
