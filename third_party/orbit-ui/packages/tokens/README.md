# @orbit/tokens

Design tokens for **Orbit UI**: primitive colour scales, four semantic themes (Aero Minimal, Aero Scenic, Aero Dark, Accessible), glass materials, typography, spacing, radii, shadows, blur, motion, z-index and density.

```ts
import "@orbit/tokens/tokens.css"; // CSS custom properties (--orb-*)
import { cssVar, vars, themes, contrastRatio } from "@orbit/tokens"; // typed TS
```

Themes are applied with `data-orbit-theme="minimal|scenic|dark|accessible"` and density with `data-orbit-density="comfortable|compact"` on any element. Reduced transparency and motion are honoured automatically. `tokens.json` is included for tooling.
