package server

import (
	"context"
	"strings"
	"sync"

	"github.com/tryshchenko/trustworthy/internal/db"
	"github.com/tryshchenko/trustworthy/internal/ingest"
)

// siteCache resolves page hosts to sites without a database round-trip per hit.
type siteCache struct {
	store *db.Store
	mu    sync.RWMutex
	byDom map[string]ingest.Site
}

func newSiteCache(store *db.Store) *siteCache {
	return &siteCache{store: store, byDom: map[string]ingest.Site{}}
}

func (c *siteCache) reload(ctx context.Context) error {
	sites, err := c.store.Sites(ctx)
	if err != nil {
		return err
	}
	m := make(map[string]ingest.Site, len(sites))
	for _, x := range sites {
		m[x.Domain] = ingest.Site{ID: x.ID, Domain: x.Domain}
	}
	c.mu.Lock()
	c.byDom = m
	c.mu.Unlock()
	return nil
}

// Resolve matches the host itself, then each parent domain, so that
// "blog.example.com" is attributed to a site registered as "example.com"
// unless the subdomain is registered separately.
func (c *siteCache) Resolve(host string) (ingest.Site, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	for h := host; h != ""; {
		if s, ok := c.byDom[h]; ok {
			return s, true
		}
		i := strings.IndexByte(h, '.')
		if i < 0 {
			break
		}
		h = h[i+1:]
		if !strings.Contains(h, ".") && h != "localhost" {
			break // never match a bare TLD
		}
	}
	return ingest.Site{}, false
}
