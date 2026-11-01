# @orbit/ui

React components for **Orbit UI**, a modern Frutiger Aero design system for productivity software.

```bash
pnpm add @orbit/ui @orbit/tokens @orbit/icons
```

```tsx
import "@orbit/tokens/tokens.css";
import "@orbit/ui/styles.css";
import { ThemeProvider, AeroButton, IssueCard, KanbanBoard } from "@orbit/ui";
```

- Foundation components (buttons, forms, overlays, tabs, toasts, date picker, combobox…)
- Aero components (`GlassPanel`, `AeroSidebar`, `AeroHeader`, `AeroBackground`, `FloatingInspector`, `StatusPill`, `AppShell`)
- Product components (`IssueCard`, `KanbanBoard`, `FilterBar`, `CommandPalette`, `DataGrid`, `BacklogList`, selectors, issue detail/editor, activity, comments…)

Typed, ref-forwarding, accessible (WCAG 2.2 AA), themeable via CSS custom properties, tree-shakeable ESM. See the repository docs and Storybook for the full API.
