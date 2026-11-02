import type { ReactNode } from "react";
import { countryName } from "../lib/format";

export type Dim =
  | "page"
  | "landing"
  | "referrer"
  | "channel"
  | "utm_source"
  | "utm_medium"
  | "utm_campaign"
  | "country"
  | "browser"
  | "os"
  | "device"
  | "event";

export const dimLabel: Record<Dim, string> = {
  page: "Page",
  landing: "Landing page",
  referrer: "Referrer",
  channel: "Channel",
  utm_source: "UTM source",
  utm_medium: "UTM medium",
  utm_campaign: "UTM campaign",
  country: "Country",
  browser: "Browser",
  os: "Operating system",
  device: "Device",
  event: "Event",
};

/** Filtering by a landing page is the same as filtering by its path. */
export function filterDim(dim: Dim): Dim | null {
  if (dim === "event") return null;
  return dim === "landing" ? "page" : dim;
}

export function valueLabel(dim: string, value: string): string {
  if (dim === "country") return countryName(value);
  return value || "(none)";
}

/** A quiet prefix for values that carry a code — the ISO country code. */
export function valuePrefix(dim: string, value: string): ReactNode {
  if (dim !== "country") return null;
  return (
    <span className="rowi__code" aria-hidden>
      {/^[A-Z]{2}$/.test(value) ? value : "––"}
    </span>
  );
}
