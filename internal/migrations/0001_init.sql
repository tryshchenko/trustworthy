-- Owner account. Single-tenant: there is exactly one row (id = 1).
CREATE TABLE owner (
    id            smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    email         text        NOT NULL,
    password_hash text        NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Dashboard login sessions. Only a SHA-256 of the token is stored.
CREATE TABLE sessions (
    token_hash bytea       PRIMARY KEY,
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL
);
CREATE INDEX sessions_expires_at_idx ON sessions (expires_at);

CREATE TABLE sites (
    id             bigserial   PRIMARY KEY,
    domain         text        NOT NULL UNIQUE,
    name           text        NOT NULL,
    timezone       text        NOT NULL DEFAULT 'UTC',
    retention_days integer     NOT NULL DEFAULT 730 CHECK (retention_days >= 0),
    color          text        NOT NULL DEFAULT '#1A78E6',
    created_at     timestamptz NOT NULL DEFAULT now(),
    first_hit_at   timestamptz,
    last_hit_at    timestamptz
);

-- Conversion goals: either a custom event name or a page path pattern.
CREATE TABLE goals (
    id         bigserial   PRIMARY KEY,
    site_id    bigint      NOT NULL REFERENCES sites (id) ON DELETE CASCADE,
    name       text        NOT NULL,
    kind       text        NOT NULL CHECK (kind IN ('event', 'page')),
    match      text        NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (site_id, kind, match)
);

-- Hourly aggregates. Individual hits are never stored: the ingestion pipeline
-- folds every request into a counter row keyed by (site, hour, dimensions).
-- No column can identify or link a visitor.
CREATE TABLE stats_hourly (
    site_id      bigint      NOT NULL REFERENCES sites (id) ON DELETE CASCADE,
    hour         timestamptz NOT NULL,
    dims_key     bigint      NOT NULL,
    kind         smallint    NOT NULL, -- 1 = pageview, 2 = custom event
    path         text        NOT NULL DEFAULT '',
    referrer     text        NOT NULL DEFAULT '',
    channel      text        NOT NULL DEFAULT '',
    utm_source   text        NOT NULL DEFAULT '',
    utm_medium   text        NOT NULL DEFAULT '',
    utm_campaign text        NOT NULL DEFAULT '',
    country      text        NOT NULL DEFAULT '',
    browser      text        NOT NULL DEFAULT '',
    os           text        NOT NULL DEFAULT '',
    device       text        NOT NULL DEFAULT '',
    event_name   text        NOT NULL DEFAULT '',
    hits         bigint      NOT NULL DEFAULT 0,
    arrivals     bigint      NOT NULL DEFAULT 0,
    PRIMARY KEY (site_id, hour, dims_key)
);
