package stats

import (
	"context"
	"encoding/csv"
	"io"
	"strconv"
	"time"
)

// ExportHeader lists the CSV columns produced by ExportCSV.
var ExportHeader = []string{
	"date", "type", "page", "referrer", "channel", "utm_source", "utm_medium", "utm_campaign",
	"country", "browser", "os", "device", "event", "count", "visits",
}

// ExportCSV streams daily aggregates for the query as CSV. Rows are already
// anonymous aggregates; nothing in the export identifies a visitor.
func (s *Service) ExportCSV(ctx context.Context, q Query, w io.Writer) error {
	where, args := q.where()
	args = append(args, q.Range.Loc.String())
	rows, err := s.Pool.Query(ctx, `
		SELECT (hour AT TIME ZONE $`+strconv.Itoa(len(args))+`)::date AS day, kind, path, referrer, channel,
		       utm_source, utm_medium, utm_campaign, country, browser, os, device, event_name,
		       sum(hits), sum(arrivals)
		FROM stats_hourly WHERE `+where+`
		GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13
		ORDER BY 1, 2, 14 DESC`, args...)
	if err != nil {
		return err
	}
	defer rows.Close()

	cw := csv.NewWriter(w)
	if err := cw.Write(ExportHeader); err != nil {
		return err
	}
	rec := make([]string, len(ExportHeader))
	for rows.Next() {
		var (
			day                        time.Time
			kind                       int16
			hits, arrivals             int64
			path, ref, ch, src, med    string
			camp, ctry, br, os, dev, e string
		)
		if err := rows.Scan(&day, &kind, &path, &ref, &ch, &src, &med, &camp, &ctry, &br, &os, &dev, &e, &hits, &arrivals); err != nil {
			return err
		}
		typ := "pageview"
		if kind == 2 {
			typ = "event"
		}
		rec[0], rec[1] = day.Format("2006-01-02"), typ
		rec[2], rec[3], rec[4], rec[5], rec[6], rec[7] = csvSafe(path), csvSafe(ref), ch, csvSafe(src), csvSafe(med), csvSafe(camp)
		rec[8], rec[9], rec[10], rec[11], rec[12] = ctry, br, os, dev, csvSafe(e)
		rec[13], rec[14] = strconv.FormatInt(hits, 10), strconv.FormatInt(arrivals, 10)
		if err := cw.Write(rec); err != nil {
			return err
		}
	}
	cw.Flush()
	if err := cw.Error(); err != nil {
		return err
	}
	return rows.Err()
}

// csvSafe neutralises spreadsheet formula injection in user-influenced fields.
func csvSafe(s string) string {
	if s != "" {
		switch s[0] {
		case '=', '+', '-', '@', '\t', '\r':
			return "'" + s
		}
	}
	return s
}
