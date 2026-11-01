# Theming

## How themes work

`@orbit/tokens` generates one stylesheet (`tokens.css`) containing:

```css
:root { /* static tokens: spacing, radius, type, motion, z-index, palette */ }
:root, [data-orbit-theme="minimal"] { /* semantic tokens */ }
[data-orbit-theme="scenic"] { … }
[data-orbit-theme="dark"] { color-scheme: dark; … }
[data-orbit-theme="accessible"] { … }
:root, [data-orbit-density="comfortable"] { … }
[data-orbit-density="compact"] { … }
@media (prefers-reduced-transparency: reduce) { /* opaque glass */ }
[data-orbit-transparency="reduced"] { /* opaque glass */ }
@media (prefers-reduced-motion: reduce) { /* durations → 0ms */ }
[data-orbit-motion="reduced"] { /* durations → 0ms */ }
```

Components only reference semantic tokens (`var(--orb-color-accent)`, `var(--orb-glass-standard-bg)`, `var(--orb-density-control-md)`). Switching theme or density is just an attribute change: no re-render, no CSS-in-JS.

Because themes are attribute-scoped, you can nest them, for example a dark panel inside a light page:

```tsx
<ThemeProvider scope="local" theme="dark">
  …
</ThemeProvider>
```

## The four themes

| Theme                      | Intent                                                           | Glass                                                                                                                       | Scenery                                              |
| -------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| **Aero Minimal** (default) | Bright, understated, professional                                | Standard                                                                                                                    | Soft glows and light ribbons                         |
| **Aero Scenic**            | A modern take on the Windows Vista palette: deeper, richer tones | Dark smoky glass for chrome (sidebar, header) with light text; bright, dense glass and a light "window" surface for content | Deep blue-teal sky, aurora sweep, dark rolling hills |
| **Aero Dark**              | Dark navy glass, restrained cyan                                 | Navy glass                                                                                                                  | Deep radial gradient, faint ribbons                  |
| **Accessible**             | High contrast, reduced effects                                   | **Opaque**, no blur, no sheen                                                                                               | None                                                 |

All four pass the token contrast suite and in-browser axe colour-contrast scans.

Scenic keeps the same radii, controls and spacing as every other theme. It only borrows Vista's colour and mood.

## Themed chrome

A theme can define `chrome` token overrides. These apply to any element marked `data-orbit-chrome` (`AeroSidebar` and `AeroHeader` set it automatically). Scenic uses this to pair dark glass frames with light content. Overrides cascade to everything inside the chrome (buttons, badges, the project switcher), are covered by the contrast test suite, and fall back to opaque surfaces under reduced transparency. Mark your own chrome regions (a custom toolbar, say) with the same attribute:

```tsx
<div data-orbit-chrome className="orb-material-standard">
  …
</div>
```

## Customising

### Override a few tokens

```css
:root,
[data-orbit-theme="minimal"] {
  --orb-color-accent: #5b3df5;
  --orb-color-accent-hover: #4a2fe0;
  --orb-color-accent-gradient: linear-gradient(180deg, #7d66ff, #5b3df5 55%, #4a2fe0);
}
```

Keep overrides in the same selectors as `tokens.css`, and load them after it.

### Create a new theme in code

Themes are plain typed objects. Add one in `packages/tokens/src/themes.ts`:

```ts
const sunset: ThemeTokens = { ...minimal, "color-accent": "#E8590C", /* … */ };
export const themes = { …, sunset: { name: "sunset", label: "Sunset", colorScheme: "light", description: "…", tokens: sunset } };
```

Add the name to `ThemeName`, rebuild (`pnpm build:tokens`) and run `pnpm test`. The contrast suite automatically covers the new theme, including text on every glass material over the theme's scene colours.

### Reading tokens in TypeScript

```ts
import { vars, cssVar, themes } from "@orbit/tokens";
style={{ boxShadow: vars["shadow-lg"], color: cssVar("color-text-secondary") }}
```

## Density

`comfortable` (default) vs `compact` changes control heights (36→30px), card padding (14→10px), row heights and panel padding. It's meant for data-dense screens. Pointer targets stay ≥ 24px (WCAG 2.5.8).

## Transparency and motion

- Users' OS preferences are respected automatically (`prefers-reduced-transparency`, `prefers-reduced-motion`).
- Apps can also offer explicit toggles: `useTheme().setTransparency("reduced")` and `setMotion("reduced")`. The demo's Settings page does this.
- Browsers without `backdrop-filter` get opaque surfaces via `@supports`, and Windows forced-colours mode gets system colours.
