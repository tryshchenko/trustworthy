import { FileText, Link2, Mail, Megaphone, Monitor, MousePointerClick, Search, Share2, Smartphone, Tablet, Tag, Zap } from "@orbit/icons";
import type { ReactNode } from "react";
import { countryName, flag } from "../lib/format";

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

const channelIcon: Record<string, ReactNode> = {
  Direct: <MousePointerClick size={13} />,
  "Organic search": <Search size={13} />,
  Social: <Share2 size={13} />,
  Email: <Mail size={13} />,
  Paid: <Megaphone size={13} />,
  Referral: <Link2 size={13} />,
  Campaign: <Tag size={13} />,
};

const deviceIcon: Record<string, ReactNode> = {
  Desktop: <Monitor size={13} />,
  Mobile: <Smartphone size={13} />,
  Tablet: <Tablet size={13} />,
};

export function valueIcon(dim: string, value: string): ReactNode {
  switch (dim) {
    case "country":
      return (
        <span className="tw-flag" aria-hidden>
          {flag(value)}
        </span>
      );
    case "channel":
      return <span className="tw-glyph" aria-hidden>{channelIcon[value] ?? <Link2 size={13} />}</span>;
    case "device":
      return <span className="tw-glyph" aria-hidden>{deviceIcon[value] ?? <Monitor size={13} />}</span>;
    case "event":
      return <span className="tw-glyph" aria-hidden><Zap size={13} /></span>;
    case "page":
    case "landing":
      return <span className="tw-glyph" aria-hidden><FileText size={13} /></span>;
    case "referrer":
      // Live "Arriving from" mixes referrer hosts with channel names (e.g. "Direct").
      if (!value.includes(".") && channelIcon[value]) return <span className="tw-glyph" aria-hidden>{channelIcon[value]}</span>;
      return <span className="tw-glyph" aria-hidden>{(value.replace(/^www\./, "")[0] ?? "?").toUpperCase()}</span>;
    case "browser":
    case "os":
    case "utm_source":
    case "utm_medium":
    case "utm_campaign":
      return (
        <span className="tw-glyph" aria-hidden>
          {(value.replace(/^www\./, "")[0] ?? "?").toUpperCase()}
        </span>
      );
  }
  return null;
}
