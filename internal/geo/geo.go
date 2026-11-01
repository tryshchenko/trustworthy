// Package geo resolves a coarse country without looking at IP addresses.
//
// The tracking script reports the browser's IANA time zone (e.g.
// "Europe/Berlin"), which is mapped to a country. This is deliberately coarse:
// it is wrong for travellers and for zones shared by several countries, but it
// requires no IP processing, no external database and no network calls.
package geo

import "strings"

// FromTimeZone returns the ISO 3166-1 alpha-2 country for an IANA time zone,
// or "" when unknown.
func FromTimeZone(tz string) string {
	tz = strings.TrimSpace(tz)
	if tz == "" || len(tz) > 64 {
		return ""
	}
	return zoneCountry[tz]
}

// NormalizeCode validates a country code supplied by a trusted edge proxy
// header (such as CF-IPCountry) and returns it upper-cased, or "".
func NormalizeCode(code string) string {
	code = strings.ToUpper(strings.TrimSpace(code))
	if len(code) != 2 || code == "XX" || code == "T1" {
		return ""
	}
	for _, r := range code {
		if r < 'A' || r > 'Z' {
			return ""
		}
	}
	return code
}
