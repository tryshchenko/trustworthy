// Package auth implements owner authentication for the dashboard.
package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base32"
	"encoding/base64"
	"errors"
	"net/mail"
	"strings"
	"sync"
	"time"

	"golang.org/x/crypto/bcrypt"
)

const (
	MinPasswordLen = 10
	MaxPasswordLen = 72 // bcrypt limit
	bcryptCost     = 12
)

var (
	ErrWeakPassword = errors.New("password must be between 10 and 72 characters")
	ErrBadEmail     = errors.New("enter a valid email address")
)

// HashPassword returns a bcrypt hash.
func HashPassword(pw string) (string, error) {
	if err := ValidatePassword(pw); err != nil {
		return "", err
	}
	h, err := bcrypt.GenerateFromPassword([]byte(pw), bcryptCost)
	return string(h), err
}

// CheckPassword compares in constant time.
func CheckPassword(hash, pw string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(pw)) == nil
}

// dummyHash is compared against when no owner exists so that response timing
// does not reveal whether the account exists.
var dummyHash, _ = bcrypt.GenerateFromPassword([]byte("timing-equaliser"), bcryptCost)

func CheckPasswordOrDummy(hash, pw string) bool {
	if hash == "" {
		_ = bcrypt.CompareHashAndPassword(dummyHash, []byte(pw))
		return false
	}
	return CheckPassword(hash, pw)
}

func ValidatePassword(pw string) error {
	if len(pw) < MinPasswordLen || len(pw) > MaxPasswordLen {
		return ErrWeakPassword
	}
	return nil
}

func NormalizeEmail(e string) (string, error) {
	e = strings.TrimSpace(e)
	a, err := mail.ParseAddress(e)
	if err != nil || a.Address != e || len(e) > 254 {
		return "", ErrBadEmail
	}
	return strings.ToLower(e), nil
}

// NewToken returns a random session token and its SHA-256 hash. Only the hash
// is persisted, so a database leak does not expose usable sessions.
func NewToken() (token string, hash []byte) {
	b := make([]byte, 32)
	_, _ = rand.Read(b)
	token = base64.RawURLEncoding.EncodeToString(b)
	return token, HashToken(token)
}

func HashToken(token string) []byte {
	s := sha256.Sum256([]byte(token))
	return s[:]
}

// NewSetupCode returns a short human-friendly one-time code, e.g. "K7QF-2MXA-PT3D".
func NewSetupCode() string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	s := base32.StdEncoding.WithPadding(base32.NoPadding).EncodeToString(b)[:12]
	return s[0:4] + "-" + s[4:8] + "-" + s[8:12]
}

// SetupCodeMatches compares setup codes ignoring case, spaces and dashes.
func SetupCodeMatches(want, got string) bool {
	norm := func(s string) string {
		return strings.ToUpper(strings.NewReplacer("-", "", " ", "").Replace(strings.TrimSpace(s)))
	}
	w, g := norm(want), norm(got)
	return w != "" && subtle.ConstantTimeCompare([]byte(w), []byte(g)) == 1
}

// Limiter is a small fixed-window rate limiter keyed by opaque strings.
// Keys are kept in memory only and expire after the window.
type Limiter struct {
	mu     sync.Mutex
	limit  int
	window time.Duration
	hits   map[string]*window
	now    func() time.Time
}

type window struct {
	start time.Time
	count int
}

func NewLimiter(limit int, per time.Duration) *Limiter {
	return &Limiter{limit: limit, window: per, hits: make(map[string]*window), now: time.Now}
}

// Allow records an attempt and reports whether it is within the limit.
func (l *Limiter) Allow(key string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	now := l.now()
	w, ok := l.hits[key]
	if !ok || now.Sub(w.start) >= l.window {
		if len(l.hits) > 50_000 {
			l.sweepLocked(now)
		}
		l.hits[key] = &window{start: now, count: 1}
		return true
	}
	w.count++
	return w.count <= l.limit
}

// Blocked reports whether key is over the limit without recording an attempt.
func (l *Limiter) Blocked(key string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	w, ok := l.hits[key]
	return ok && l.now().Sub(w.start) < l.window && w.count >= l.limit
}

func (l *Limiter) Reset(key string) {
	l.mu.Lock()
	delete(l.hits, key)
	l.mu.Unlock()
}

// Sweep removes expired windows.
func (l *Limiter) Sweep() {
	l.mu.Lock()
	l.sweepLocked(l.now())
	l.mu.Unlock()
}

func (l *Limiter) sweepLocked(now time.Time) {
	for k, w := range l.hits {
		if now.Sub(w.start) >= l.window {
			delete(l.hits, k)
		}
	}
}
