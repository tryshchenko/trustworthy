# Design philosophy

Orbit is what Windows Aero might look like if it had been designed in 2026 for people who live in a project tracker all day.

## Three ingredients

1. **Frutiger Aero**: optimism, sky blue and aqua, glass, environmental imagery, soft illumination, gentle reflections.
2. **Enterprise SaaS**: clear information architecture, efficient workflows, dense readable data, predictable navigation.
3. **Contemporary engineering**: tokens, accessible primitives, responsive layout and a measurable performance budget.

## The 70 / 20 / 10 rule

| Share of visual emphasis       | Treatment                                                                      | Examples                                                                                      |
| ------------------------------ | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| **70%** clean and functional   | Opaque white/navy surfaces, hairline borders, crisp type                       | Issue cards, tables, forms, inspector content, comments                                       |
| **20%** Aero material          | Frosted glass, luminous borders, top-edge highlights, soft shadows             | Sidebar, header, sprint panel, popovers, menus, dialogs, inspector chrome, the primary action |
| **10%** atmosphere and delight | Scenic background, light ribbons, bubbles, glow on the active tab and nav item | `AeroBackground`, `.orb-tabs` indicator, `AeroButton` sheen                                   |

If a screen starts to feel like a Vista screensaver, take the glass away from content first.

## Materials, not effects

Components never invent their own translucency. They pick a **material**:

- `glass/subtle`: 8px blur, about 52% white. Large regions like the sidebar.
- `glass/standard`: 16px blur, about 70% white. Header, floating panels.
- `glass/raised`: 24px blur, about 84% white. Overlays, the inspector, dialogs.
- `surface/solid`: opaque. Anything you read for more than a second.
- `surface/selected`: opaque accent tint.

Each glass material is translucent fill + sheen gradient + blur/saturate + 1px luminous border + top-edge highlight + diffuse navy shadow. Each has an opaque fallback for unsupported browsers, reduced-transparency preferences and the Accessible theme.

## Colour

Built on the brand starting points (`#EAF6FC` canvas, `#086BEE` primary, `#19BCE4` cyan, `#12B8AE` teal, `#122D4B` / `#54708D` text), extended into full 50–950 scales. Semantic tokens map meaning (accent, tones, text levels, borders, surfaces) onto those scales per theme. Themes never change meaning, only appearance.

Secondary text was darkened slightly (`#4C6886`) from the brand `#54708D` so it passes AA on every glass material over every backdrop. The token tests enforce this.

## Typography

Inter at 14px body, a 1.2–1.65 line-height scale and semantic roles (`page-title` 28px, `section-title` 18px, `card-title` 14px medium, `meta` 12px). Weights are restrained: 600 for headings, 500 for controls, never 800+.

## Geometry

- Spacing: 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48
- Radii: 6 (controls, small) · 10 (cards, inputs) · 14 (columns, menus) · 18 (panels, shell) · 24 (dialogs)
- Shadows are navy-tinted and diffuse, never pure black. Blue ambient light appears only on glass edges and the primary button.

## Motion

Short, calm and never in the way: buttons 140ms, cards 180ms, menus 200ms, drawers and sidebar 240ms, with a standard `cubic-bezier(0.2, 0, 0, 1)`. No bounce. Only transform, opacity and colour animate. Every duration is a token that drops to `0ms` under reduced motion.

## What Orbit is _not_

- A Vista recreation: no heavy gloss on every control, no orbs-as-buttons.
- A generic dashboard kit with a blue background.
- Transparent for its own sake: text never sits on raw imagery.
- A concept shot: every component is built for real workflows, with keyboard access, density modes and large data.
