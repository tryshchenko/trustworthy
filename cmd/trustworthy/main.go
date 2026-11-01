// Command trustworthy runs the privacy-first analytics server.
package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"regexp"
	"syscall"
	"time"
	_ "time/tzdata" // site time zones work even in minimal containers

	"github.com/tryshchenko/trustworthy/internal/auth"
	"github.com/tryshchenko/trustworthy/internal/config"
	"github.com/tryshchenko/trustworthy/internal/db"
	"github.com/tryshchenko/trustworthy/internal/ingest"
	"github.com/tryshchenko/trustworthy/internal/migrations"
	"github.com/tryshchenko/trustworthy/internal/server"
	"github.com/tryshchenko/trustworthy/internal/stats"
)

// version is set at build time with -ldflags "-X main.version=…".
var version = "dev"

func main() {
	if len(os.Args) > 1 && os.Args[1] == "healthcheck" {
		os.Exit(healthcheck())
	}
	if len(os.Args) > 1 && (os.Args[1] == "version" || os.Args[1] == "--version") {
		fmt.Println(version)
		return
	}
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, "fatal:", err)
		os.Exit(1)
	}
}

// healthcheck lets Docker probe the container without curl/wget in the image.
func healthcheck() int {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	c := http.Client{Timeout: 3 * time.Second}
	resp, err := c.Get("http://127.0.0.1:" + port + "/healthz")
	if err != nil {
		return 1
	}
	resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return 1
	}
	return 0
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}
	logger := newLogger(cfg.LogLevel)
	slog.SetDefault(logger)

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	pool, err := db.Open(ctx, cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer pool.Close()
	if err := migrations.Run(ctx, pool, logger); err != nil {
		return err
	}
	store := db.New(pool)

	rt := ingest.NewRealtime()
	buffer := ingest.NewBuffer(pool, rt, logger)
	srv := server.New(server.Options{
		Config: cfg, Logger: logger, Store: store, Stats: &stats.Service{Pool: pool},
		Buffer: buffer, Realtime: rt, Version: version,
	})
	if err := srv.Init(ctx); err != nil {
		return err
	}
	if err := bootstrapOwner(ctx, cfg, store, srv, logger); err != nil {
		return err
	}

	bgCtx, cancelBg := context.WithCancel(context.Background())
	bufferDone := make(chan struct{})
	go func() { buffer.Run(bgCtx, cfg.FlushInterval); close(bufferDone) }()
	go srv.Maintain(bgCtx)
	go retentionLoop(bgCtx, store, logger)

	httpServer := &http.Server{
		Addr:              cfg.Addr,
		Handler:           srv.Handler(),
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      120 * time.Second, // CSV exports can take a while
		IdleTimeout:       120 * time.Second,
		MaxHeaderBytes:    32 << 10,
		ErrorLog:          log.New(redactingWriter{logger}, "", 0),
	}
	errc := make(chan error, 1)
	go func() {
		logger.Info("listening", "addr", cfg.Addr, "version", version)
		errc <- httpServer.ListenAndServe()
	}()

	select {
	case err := <-errc:
		cancelBg()
		<-bufferDone
		return err
	case <-ctx.Done():
	}
	logger.Info("shutting down")
	shCtx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	if err := httpServer.Shutdown(shCtx); err != nil && !errors.Is(err, http.ErrServerClosed) {
		logger.Warn("http shutdown", "err", err)
	}
	cancelBg() // triggers the final flush of buffered hits
	<-bufferDone
	return nil
}

// bootstrapOwner creates/updates the owner from ADMIN_EMAIL/ADMIN_PASSWORD, or
// enables the first-run setup screen guarded by a one-time code in the logs.
func bootstrapOwner(ctx context.Context, cfg config.Config, store *db.Store, srv *server.Server, log *slog.Logger) error {
	if cfg.AdminEmail != "" {
		email, err := auth.NormalizeEmail(cfg.AdminEmail)
		if err != nil {
			return fmt.Errorf("ADMIN_EMAIL: %w", err)
		}
		o, err := store.Owner(ctx)
		if err == nil && o.Email == email && auth.CheckPassword(o.PasswordHash, cfg.AdminPassword) {
			return nil
		}
		hash, err := auth.HashPassword(cfg.AdminPassword)
		if err != nil {
			return fmt.Errorf("ADMIN_PASSWORD: %w", err)
		}
		if err := store.UpsertOwner(ctx, email, hash); err != nil {
			return err
		}
		log.Info("owner account configured from ADMIN_EMAIL / ADMIN_PASSWORD")
		return nil
	}
	has, err := store.HasOwner(ctx)
	if err != nil || has {
		return err
	}
	code := auth.NewSetupCode()
	srv.SetSetupCode(code)
	log.Warn("no owner account yet — open the dashboard and enter this setup code", "setup_code", code)
	return nil
}

func retentionLoop(ctx context.Context, store *db.Store, log *slog.Logger) {
	purge := func() {
		n, err := store.PurgeExpired(ctx)
		if err != nil && ctx.Err() == nil {
			log.Warn("retention purge failed", "err", err)
			return
		}
		if n > 0 {
			log.Info("retention purge", "rows", n)
		}
	}
	purge()
	t := time.NewTicker(6 * time.Hour)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			purge()
		}
	}
}

func newLogger(level string) *slog.Logger {
	var l slog.Level
	switch level {
	case "debug":
		l = slog.LevelDebug
	case "warn":
		l = slog.LevelWarn
	case "error":
		l = slog.LevelError
	default:
		l = slog.LevelInfo
	}
	return slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: l}))
}

var ipPattern = regexp.MustCompile(`\b(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?\b|\[?[0-9a-fA-F]{0,4}(?::[0-9a-fA-F]{0,4}){2,7}\]?(?::\d+)?`)

// redactingWriter routes net/http's internal error log (e.g. TLS or header
// errors, which include the client address) through slog with IPs removed.
type redactingWriter struct{ log *slog.Logger }

func (w redactingWriter) Write(p []byte) (int, error) {
	w.log.Warn("http server", "msg", ipPattern.ReplaceAllString(string(p), "[redacted]"))
	return len(p), nil
}
