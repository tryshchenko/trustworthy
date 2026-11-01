// Package db contains the PostgreSQL-backed persistence for configuration
// entities (owner, sessions, sites, goals). Analytics aggregates live in the
// stats and ingest packages.
package db

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrNotFound = errors.New("not found")
	ErrConflict = errors.New("already exists")
)

// Open connects to PostgreSQL and verifies the connection, retrying for a
// short while so the app can start alongside a database container.
func Open(ctx context.Context, url string) (*pgxpool.Pool, error) {
	cfg, err := pgxpool.ParseConfig(url)
	if err != nil {
		return nil, fmt.Errorf("parse DATABASE_URL: %w", err)
	}
	if cfg.MaxConns < 4 {
		cfg.MaxConns = 4
	}
	cfg.MaxConnIdleTime = 5 * time.Minute
	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, err
	}
	deadline := time.Now().Add(60 * time.Second)
	for {
		pctx, cancel := context.WithTimeout(ctx, 3*time.Second)
		err = pool.Ping(pctx)
		cancel()
		if err == nil {
			return pool, nil
		}
		if time.Now().After(deadline) || ctx.Err() != nil {
			pool.Close()
			return nil, fmt.Errorf("connect to database: %w", err)
		}
		time.Sleep(2 * time.Second)
	}
}

// Store wraps the connection pool with typed queries.
type Store struct{ Pool *pgxpool.Pool }

func New(pool *pgxpool.Pool) *Store { return &Store{Pool: pool} }

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}

/* ------------------------------------------------------------------ owner */

type Owner struct {
	Email        string
	PasswordHash string
}

func (s *Store) Owner(ctx context.Context) (Owner, error) {
	var o Owner
	err := s.Pool.QueryRow(ctx, `SELECT email, password_hash FROM owner WHERE id = 1`).Scan(&o.Email, &o.PasswordHash)
	if errors.Is(err, pgx.ErrNoRows) {
		return o, ErrNotFound
	}
	return o, err
}

func (s *Store) HasOwner(ctx context.Context) (bool, error) {
	var ok bool
	err := s.Pool.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM owner)`).Scan(&ok)
	return ok, err
}

// CreateOwner inserts the owner row; it fails with ErrConflict if one exists.
func (s *Store) CreateOwner(ctx context.Context, email, hash string) error {
	_, err := s.Pool.Exec(ctx, `INSERT INTO owner (id, email, password_hash) VALUES (1, $1, $2)`, email, hash)
	if isUniqueViolation(err) {
		return ErrConflict
	}
	return err
}

// UpsertOwner creates or replaces the owner credentials (used for env bootstrap).
func (s *Store) UpsertOwner(ctx context.Context, email, hash string) error {
	_, err := s.Pool.Exec(ctx, `
		INSERT INTO owner (id, email, password_hash) VALUES (1, $1, $2)
		ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, updated_at = now()`,
		email, hash)
	return err
}

func (s *Store) UpdateOwner(ctx context.Context, email, hash string) error {
	_, err := s.Pool.Exec(ctx, `UPDATE owner SET email = $1, password_hash = $2, updated_at = now() WHERE id = 1`, email, hash)
	return err
}

/* --------------------------------------------------------------- sessions */

func (s *Store) CreateSession(ctx context.Context, tokenHash []byte, expires time.Time) error {
	_, err := s.Pool.Exec(ctx, `INSERT INTO sessions (token_hash, expires_at) VALUES ($1, $2)`, tokenHash, expires)
	return err
}

func (s *Store) SessionValid(ctx context.Context, tokenHash []byte) (bool, error) {
	var ok bool
	err := s.Pool.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM sessions WHERE token_hash = $1 AND expires_at > now())`, tokenHash).Scan(&ok)
	return ok, err
}

func (s *Store) DeleteSession(ctx context.Context, tokenHash []byte) error {
	_, err := s.Pool.Exec(ctx, `DELETE FROM sessions WHERE token_hash = $1`, tokenHash)
	return err
}

// DeleteAllSessions signs out every device (used after a password change).
func (s *Store) DeleteAllSessions(ctx context.Context, except []byte) error {
	_, err := s.Pool.Exec(ctx, `DELETE FROM sessions WHERE token_hash <> $1`, except)
	return err
}

/* ------------------------------------------------------------------ sites */

type Site struct {
	ID            int64      `json:"id"`
	Domain        string     `json:"domain"`
	Name          string     `json:"name"`
	Timezone      string     `json:"timezone"`
	RetentionDays int        `json:"retentionDays"`
	Color         string     `json:"color"`
	CreatedAt     time.Time  `json:"createdAt"`
	FirstHitAt    *time.Time `json:"firstHitAt"`
	LastHitAt     *time.Time `json:"lastHitAt"`
}

const siteCols = `id, domain, name, timezone, retention_days, color, created_at, first_hit_at, last_hit_at`

func scanSite(row pgx.Row) (Site, error) {
	var x Site
	err := row.Scan(&x.ID, &x.Domain, &x.Name, &x.Timezone, &x.RetentionDays, &x.Color, &x.CreatedAt, &x.FirstHitAt, &x.LastHitAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return x, ErrNotFound
	}
	return x, err
}

func (s *Store) Sites(ctx context.Context) ([]Site, error) {
	rows, err := s.Pool.Query(ctx, `SELECT `+siteCols+` FROM sites ORDER BY name, id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Site{}
	for rows.Next() {
		x, err := scanSite(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, x)
	}
	return out, rows.Err()
}

func (s *Store) Site(ctx context.Context, id int64) (Site, error) {
	return scanSite(s.Pool.QueryRow(ctx, `SELECT `+siteCols+` FROM sites WHERE id = $1`, id))
}

func (s *Store) CreateSite(ctx context.Context, x Site) (Site, error) {
	out, err := scanSite(s.Pool.QueryRow(ctx, `
		INSERT INTO sites (domain, name, timezone, retention_days, color)
		VALUES ($1, $2, $3, $4, $5) RETURNING `+siteCols,
		x.Domain, x.Name, x.Timezone, x.RetentionDays, x.Color))
	if isUniqueViolation(err) {
		return out, ErrConflict
	}
	return out, err
}

func (s *Store) UpdateSite(ctx context.Context, x Site) (Site, error) {
	out, err := scanSite(s.Pool.QueryRow(ctx, `
		UPDATE sites SET domain = $2, name = $3, timezone = $4, retention_days = $5, color = $6
		WHERE id = $1 RETURNING `+siteCols,
		x.ID, x.Domain, x.Name, x.Timezone, x.RetentionDays, x.Color))
	if isUniqueViolation(err) {
		return out, ErrConflict
	}
	return out, err
}

func (s *Store) DeleteSite(ctx context.Context, id int64) error {
	tag, err := s.Pool.Exec(ctx, `DELETE FROM sites WHERE id = $1`, id)
	if err == nil && tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return err
}

// ResetSiteData removes every aggregate for a site but keeps its settings.
func (s *Store) ResetSiteData(ctx context.Context, id int64) error {
	return pgx.BeginFunc(ctx, s.Pool, func(tx pgx.Tx) error {
		if _, err := tx.Exec(ctx, `DELETE FROM stats_hourly WHERE site_id = $1`, id); err != nil {
			return err
		}
		_, err := tx.Exec(ctx, `UPDATE sites SET first_hit_at = NULL, last_hit_at = NULL WHERE id = $1`, id)
		return err
	})
}

/* ------------------------------------------------------------------ goals */

type Goal struct {
	ID        int64     `json:"id"`
	SiteID    int64     `json:"siteId"`
	Name      string    `json:"name"`
	Kind      string    `json:"kind"` // "event" | "page"
	Match     string    `json:"match"`
	CreatedAt time.Time `json:"createdAt"`
}

func (s *Store) Goals(ctx context.Context, siteID int64) ([]Goal, error) {
	rows, err := s.Pool.Query(ctx, `SELECT id, site_id, name, kind, match, created_at FROM goals WHERE site_id = $1 ORDER BY created_at, id`, siteID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Goal{}
	for rows.Next() {
		var g Goal
		if err := rows.Scan(&g.ID, &g.SiteID, &g.Name, &g.Kind, &g.Match, &g.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, g)
	}
	return out, rows.Err()
}

func (s *Store) CreateGoal(ctx context.Context, g Goal) (Goal, error) {
	err := s.Pool.QueryRow(ctx, `
		INSERT INTO goals (site_id, name, kind, match) VALUES ($1, $2, $3, $4)
		RETURNING id, created_at`, g.SiteID, g.Name, g.Kind, g.Match).Scan(&g.ID, &g.CreatedAt)
	if isUniqueViolation(err) {
		return g, ErrConflict
	}
	return g, err
}

func (s *Store) DeleteGoal(ctx context.Context, siteID, id int64) error {
	tag, err := s.Pool.Exec(ctx, `DELETE FROM goals WHERE site_id = $1 AND id = $2`, siteID, id)
	if err == nil && tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return err
}

/* -------------------------------------------------------------- retention */

// PurgeExpired applies each site's retention period and removes stale
// sessions. It returns the number of aggregate rows deleted.
func (s *Store) PurgeExpired(ctx context.Context) (int64, error) {
	tag, err := s.Pool.Exec(ctx, `
		DELETE FROM stats_hourly s USING sites
		WHERE s.site_id = sites.id
		  AND sites.retention_days > 0
		  AND s.hour < date_trunc('day', now()) - make_interval(days => sites.retention_days)`)
	if err != nil {
		return 0, err
	}
	if _, err := s.Pool.Exec(ctx, `DELETE FROM sessions WHERE expires_at < now()`); err != nil {
		return tag.RowsAffected(), err
	}
	return tag.RowsAffected(), nil
}
