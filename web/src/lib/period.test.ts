import { describe, expect, it } from "vitest";
import { addDays, apiQuery, daysBetween, readState, resolvePeriod, todayIn } from "./period";
import { change, compact, flag, niceScale, percent } from "./format";

describe("periods", () => {
  it("resolves presets relative to today", () => {
    expect(resolvePeriod("7d", "2026-03-10")).toEqual({ from: "2026-03-04", to: "2026-03-10" });
    expect(resolvePeriod("lastmonth", "2026-01-15")).toEqual({ from: "2025-12-01", to: "2025-12-31" });
    expect(resolvePeriod("month", "2026-02-20")).toEqual({ from: "2026-02-01", to: "2026-02-20" });
    expect(resolvePeriod("year", "2026-02-20")).toEqual({ from: "2026-01-01", to: "2026-02-20" });
    expect(daysBetween("2026-03-04", "2026-03-10")).toBe(7);
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("rejects invalid custom ranges", () => {
    expect(resolvePeriod("custom", "2026-03-10", { from: "2026-03-09", to: "2026-03-01" })).toEqual(resolvePeriod("30d", "2026-03-10"));
    expect(resolvePeriod("custom", "2026-03-10", { from: "nope", to: "2026-03-01" }).to).toBe("2026-03-10");
  });

  it("computes today in the site's time zone", () => {
    const now = new Date("2026-03-10T23:30:00Z");
    expect(todayIn("UTC", now)).toBe("2026-03-10");
    expect(todayIn("Asia/Tokyo", now)).toBe("2026-03-11");
    expect(todayIn("America/Los_Angeles", now)).toBe("2026-03-10");
  });

  it("round-trips URL state into API queries", () => {
    const s = readState(new URLSearchParams("period=7d&compare=year&filter=country:DE&filter=page:/a:b"), "UTC", new Date("2026-03-10T12:00:00Z"));
    expect(s.filters).toEqual([{ dim: "country", value: "DE" }, { dim: "page", value: "/a:b" }]);
    const q = new URLSearchParams(apiQuery(s));
    expect(q.get("from")).toBe("2026-03-04");
    expect(q.get("compare")).toBe("year");
    expect(q.getAll("filter")).toEqual(["country:DE", "page:/a:b"]);
    expect(readState(new URLSearchParams("period=bogus&compare=none"), "UTC").compare).toBe("none");
  });
});

describe("format", () => {
  it("formats numbers for display", () => {
    expect(compact(9_999)).toBe((9999).toLocaleString());
    expect(compact(12_900)).toMatch(/12\.9K/);
    expect(percent(0.05)).toBe("<0.1%");
    expect(percent(42.123)).toBe("42%");
    expect(percent(4.25)).toBe("4.3%");
    expect(flag("DE")).toBe("🇩🇪");
    expect(flag("")).toBe("🌐");
  });

  it("computes changes without inventing baselines", () => {
    expect(change(150, 100)).toBe(50);
    expect(change(5, 0)).toBeNull();
    expect(change(0, 0)).toBe(0);
    expect(change(5, null)).toBeNull();
  });

  it("produces nice axis scales", () => {
    expect(niceScale(87)).toEqual({ max: 100, step: 25 });
    expect(niceScale(3)).toEqual({ max: 3, step: 1 });
    expect(niceScale(0)).toEqual({ max: 4, step: 1 });
    expect(niceScale(12_400)).toEqual({ max: 15_000, step: 5_000 });
  });
});
