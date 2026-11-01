// Package tracker embeds the client-side tracking script.
package tracker

import (
	"bytes"
	"compress/gzip"
	"crypto/sha256"
	_ "embed"
	"encoding/hex"
)

//go:embed script.js
var Script []byte

// Gzipped is the pre-compressed script, built once at start-up.
var Gzipped = func() []byte {
	var b bytes.Buffer
	zw, _ := gzip.NewWriterLevel(&b, gzip.BestCompression)
	_, _ = zw.Write(Script)
	_ = zw.Close()
	return b.Bytes()
}()

// ETag identifies the current script version.
var ETag = func() string {
	s := sha256.Sum256(Script)
	return `"` + hex.EncodeToString(s[:8]) + `"`
}()
