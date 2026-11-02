/* A deliberately tiny History-API router: the app has a handful of routes. */
import {
  forwardRef,
  useCallback,
  useSyncExternalStore,
  type AnchorHTMLAttributes,
  type MouseEvent,
} from "react";

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
if (typeof window !== "undefined") window.addEventListener("popstate", notify);

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}
const getHref = () => window.location.pathname + window.location.search;

export function navigate(to: string, opts: { replace?: boolean } = {}) {
  if (to === getHref()) return;
  if (opts.replace) window.history.replaceState(null, "", to);
  else window.history.pushState(null, "", to);
  notify();
  if (!opts.replace) window.scrollTo({ top: 0 });
}

export function useLocation() {
  const href = useSyncExternalStore(subscribe, getHref, () => "/");
  const url = new URL(href, "http://x");
  return { pathname: url.pathname, search: url.searchParams, href };
}

/** Returns params when `pattern` (e.g. "/sites/:id/goals") matches `path`. */
export function matchPath(pattern: string, path: string): Record<string, string> | null {
  const p = pattern.split("/").filter(Boolean);
  const s = path.split("/").filter(Boolean);
  if (p.length !== s.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < p.length; i++) {
    const seg = p[i]!;
    if (seg.startsWith(":")) params[seg.slice(1)] = decodeURIComponent(s[i]!);
    else if (seg !== s[i]) return null;
  }
  return params;
}

/** Updates query parameters on the current URL (replace by default). */
export function useSearchUpdate() {
  return useCallback((mutate: (p: URLSearchParams) => void, opts: { push?: boolean } = {}) => {
    const url = new URL(window.location.href);
    mutate(url.searchParams);
    const qs = url.searchParams.toString();
    navigate(url.pathname + (qs ? `?${qs}` : ""), { replace: !opts.push });
  }, []);
}

export function onLinkClick(e: MouseEvent<HTMLAnchorElement>, href: string) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
    return;
  e.preventDefault();
  navigate(href);
}

export const Link = forwardRef<HTMLAnchorElement, AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }>(
  function Link({ href, onClick, ...props }, ref) {
    return (
      <a
        ref={ref}
        href={href}
        onClick={(e) => {
          onClick?.(e);
          onLinkClick(e, href);
        }}
        {...props}
      />
    );
  },
);
