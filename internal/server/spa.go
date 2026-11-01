package server

import (
	"io/fs"
	"net/http"
	"path"
	"strings"

	"github.com/tryshchenko/trustworthy/internal/web"
)

// spaHandler serves the embedded dashboard. Fingerprinted assets are cached
// forever; every other path falls back to index.html for client routing.
func spaHandler() http.Handler {
	dist := web.Dist()
	files := http.FileServerFS(dist)
	index, err := fs.ReadFile(dist, "index.html")
	if err != nil {
		index = []byte(`<!doctype html><meta charset="utf-8"><title>Trustworthy</title>` +
			`<p style="font:16px system-ui;margin:3rem">The dashboard was not built into this binary. ` +
			`Run <code>pnpm install && pnpm build</code> before <code>go build</code>, or use the Docker image.</p>`)
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			w.Header().Set("Allow", "GET, HEAD")
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		p := strings.TrimPrefix(path.Clean(r.URL.Path), "/")
		if p != "" && p != "index.html" {
			if st, err := fs.Stat(dist, p); err == nil && !st.IsDir() {
				if strings.HasPrefix(p, "assets/") {
					w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
				} else {
					w.Header().Set("Cache-Control", "public, max-age=3600")
				}
				files.ServeHTTP(w, r)
				return
			}
			if strings.HasPrefix(p, "assets/") || path.Ext(p) != "" {
				http.NotFound(w, r)
				return
			}
		}
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Header().Set("Cache-Control", "no-cache")
		_, _ = w.Write(index)
	})
}
