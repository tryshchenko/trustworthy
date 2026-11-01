# Performance

## Guidelines built into the system

| Concern      | Rule                                                                                                                                                                                                      | Where it's enforced                                         |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Blur cost    | Only chrome uses `backdrop-filter` (sidebar, header, inspector, one overlay at a time). About 4 blurred surfaces maximum on screen.                                                                       | Materials. `IssueCard`, columns, rows and grids are opaque. |
| Background   | One static layer: CSS radial gradients + inline SVG. No images, no animation, `contain: strict`.                                                                                                          | `AeroBackground`                                            |
| Animation    | Only `transform`, `opacity` and colours animate. Never `backdrop-filter`, layout or blur radius.                                                                                                          | Component CSS                                               |
| Re-renders   | `IssueCard` and sortable items are `memo`ised. Selection in the demo uses an external store so only the 2 affected cards re-render. Navigation uses `startTransition`. Filtering uses `useDeferredValue`. | `Kanban.tsx`, demo `BoardCard`, `route.ts`                  |
| Large data   | `BacklogList` and `DataGrid` virtualise (TanStack Virtual). Kanban columns paginate (`pageSize`, default 60, "Show N more").                                                                              |                                                             |
| Overlays     | Menus are non-modal by default (no scroll-lock relayout).                                                                                                                                                 | `DropdownMenu`                                              |
| Layout shift | Fixed control heights via density tokens. Skeletons match final card geometry. Fonts load with `font-display: swap`.                                                                                      |                                                             |
| Bundles      | Library output is one ESM module per source module (tree-shakeable). The demo splits `react` and `vendor` chunks.                                                                                         | `packages/ui/vite.config.ts`                                |

Demo production bundle (gzip): app ≈ 48 kB, react ≈ 69 kB, vendor (Radix, dnd-kit, virtual) ≈ 72 kB, CSS ≈ 19 kB.

## Measured web vitals

`apps/showcase/e2e/perf.e2e.ts` measures the **production build** (`vite preview`) with `PerformanceObserver` while loading the board, opening an issue, typing in the filter and switching theme.

**Test environment**: Linux VM, 2 vCPU (Intel Haswell), headless Chromium 1.63 (Playwright), **no GPU** (software rasterisation), 1440×900, localhost, no network throttling.

| Metric                   | Target   | Measured                                               |
| ------------------------ | -------- | ------------------------------------------------------ |
| LCP                      | ≤ 2.5 s  | **≈ 1.2 s**                                            |
| CLS                      | ≤ 0.1    | **0.001**                                              |
| INP (max event duration) | ≤ 200 ms | **≈ 300 ms** (theme switch), **≈ 105 ms** (open issue) |

Interaction breakdown on that machine:

| Interaction                             | JS processing                    | Total until next paint |
| --------------------------------------- | -------------------------------- | ---------------------- |
| Open issue (inspector mounts)           | ≈ 5 ms (deferred via transition) | ≈ 105 ms               |
| Type in board filter                    | ≈ 45–65 ms                       | ≈ 160–240 ms           |
| Open appearance menu                    | ≈ 50 ms                          | ≈ 175 ms               |
| Switch theme (full restyle and repaint) | ≈ 80 ms                          | ≈ 290–330 ms           |

The remaining latency is mostly **rasterisation**: on this GPU-less VM each full 1440×900 frame takes about 80–100 ms to raster in software (verified with Chrome tracing; disabling all blur changes totals by < 10%). On a typical laptop with GPU compositing, frames raster in a few milliseconds.

The perf test therefore enforces:

- LCP ≤ 2.5 s and CLS ≤ 0.1 always.
- INP ≤ 200 ms when `PERF_STRICT=1` (run on representative hardware: `PERF_STRICT=1 pnpm test:e2e`), otherwise a 400 ms regression guard.

## Checklist for app teams

- Keep glass to chrome. If you need a translucent list, use `surface/solid` rows inside **one** glass container.
- Use `BacklogList`/`DataGrid` for anything that can exceed a few hundred rows.
- Pass a stable `renderItem` (`useCallback`) to `KanbanBoard` so memoised cards can skip renders.
- Wrap view/route switches in `startTransition`, and derive heavy filtering from `useDeferredValue`.
- Scenic photos for `AeroBackground imageSrc` should be AVIF/WebP ≤ 200 kB. They're loaded lazily at low priority.
