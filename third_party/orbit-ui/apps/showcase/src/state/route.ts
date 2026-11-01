import { startTransition, useCallback, useEffect, useState } from "react";

export type ViewId =
  "overview" | "issues" | "board" | "roadmap" | "calendar" | "reports" | "settings";
export const views: { id: ViewId; label: string; available: boolean }[] = [
  { id: "overview", label: "Overview", available: true },
  { id: "issues", label: "Issues", available: true },
  { id: "board", label: "Board", available: true },
  { id: "roadmap", label: "Roadmap", available: false },
  { id: "calendar", label: "Calendar", available: false },
  { id: "reports", label: "Reports", available: false },
  { id: "settings", label: "Settings", available: true },
];

export interface Route {
  view: ViewId;
  /** Selected issue key, e.g. PLAT-87. */
  issueKey: string | null;
}

function parse(hash: string): Route {
  const [, view = "board", issueKey = null] = hash.replace(/^#/, "").split("/");
  const valid = views.some((v) => v.id === view);
  return { view: valid ? (view as ViewId) : "board", issueKey: issueKey || null };
}

export const href = (r: Partial<Route> & { view: ViewId }) =>
  `#/${r.view}${r.issueKey ? `/${r.issueKey}` : ""}`;

/** Minimal hash router so views and the selected issue are deep-linkable without a router dependency. */
export function useRoute() {
  const [route, setRoute] = useState<Route>(() => parse(window.location.hash));
  useEffect(() => {
    const on = () => setRoute(parse(window.location.hash));
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  const navigate = useCallback((next: Route, opts: { replace?: boolean } = {}) => {
    const h = href(next);
    if (opts.replace) window.history.replaceState(null, "", h);
    else window.history.pushState(null, "", h);
    // A transition lets the browser paint the click feedback before React renders the
    // (heavier) next view or inspector, keeping interaction latency low.
    startTransition(() => setRoute(next));
  }, []);
  return [route, navigate] as const;
}
