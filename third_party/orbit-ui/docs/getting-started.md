# Getting started

## 1. Install

```bash
pnpm add @orbit/ui @orbit/tokens @orbit/icons react react-dom
```

`react` and `react-dom` (18.2+ or 19) are peer dependencies. Radix UI, dnd-kit, TanStack Virtual, CVA and clsx come along as regular dependencies.

## 2. Import the styles once

```ts
// main.tsx
import "@orbit/tokens/tokens.css"; // design tokens (CSS custom properties, all themes)
import "@orbit/ui/styles.css"; // component styles
```

Orbit styles are plain CSS with `orb-` prefixed classes. There's no runtime CSS-in-JS and no Tailwind requirement.

### Fonts

Tokens ask for **Inter** first and fall back to the system UI font. To ship Inter yourself:

```ts
import "@fontsource-variable/inter";
```

## 3. Add the ThemeProvider

```tsx
import { ThemeProvider } from "@orbit/ui";

<ThemeProvider defaultTheme="minimal" defaultDensity="comfortable" storageKey="my-app:theme">
  <App />
</ThemeProvider>;
```

| Prop                                             | Default         | Purpose                                                                                                       |
| ------------------------------------------------ | --------------- | ------------------------------------------------------------------------------------------------------------- |
| `theme` / `defaultTheme` / `onThemeChange`       | `"minimal"`     | `minimal`, `scenic`, `dark`, `accessible`. Controlled or uncontrolled.                                        |
| `density` / `defaultDensity` / `onDensityChange` | `"comfortable"` | `comfortable` or `compact`.                                                                                   |
| `defaultTransparency`                            | `"auto"`        | `"reduced"` replaces glass with opaque surfaces.                                                              |
| `defaultMotion`                                  | `"auto"`        | `"reduced"` zeroes all motion durations.                                                                      |
| `scope`                                          | `"document"`    | `"document"` sets `data-orbit-*` on `<html>`. `"local"` scopes to a wrapper div, and overlays portal into it. |
| `storageKey`                                     | —               | Persist settings to `localStorage`.                                                                           |

Use `useTheme()` anywhere to read or change settings. To avoid a flash of the wrong theme before React hydrates, set the attributes in your HTML (see `apps/showcase/index.html`).

## 4. Build something

```tsx
import { Plus } from "@orbit/icons";
import { AeroButton, Field, Input, Panel, toast, Toaster } from "@orbit/ui";

export function NewProject() {
  return (
    <Panel title="New project" description="Projects group issues, boards and sprints.">
      <Field label="Name" required>
        <Input placeholder="Orbit Platform" />
      </Field>
      <AeroButton
        leadingIcon={<Plus size={16} />}
        onClick={() => toast({ title: "Project created", tone: "success" })}
      >
        Create project
      </AeroButton>
      <Toaster />
    </Panel>
  );
}
```

## 5. Compose an application shell

```tsx
<AppShell
  background={<AeroBackground />}
  sidebar={<AeroSidebar header={<ProjectSwitcher … />}>…</AeroSidebar>}
  header={<AeroHeader logo={…} search={<HeaderSearch onClick={openPalette} />} actions={…} onMenuClick={openDrawer} />}
  aside={<FloatingInspector open={…} onOpenChange={…} title="PLAT-87">…</FloatingInspector>}
  sidebarOpen={drawerOpen}
  onSidebarOpenChange={setDrawerOpen}
>
  <KanbanBoard … />
</AppShell>
```

Below 1024px the sidebar becomes a drawer. Below 768px the inspector becomes a full-screen dialog. The **Patterns → Project board** story is a complete, copyable composition.

## Using Tailwind alongside Orbit

The demo app uses Tailwind v4 for page layout and maps Orbit tokens into the Tailwind theme, so utilities share the design language:

```css
@import "tailwindcss";
@theme inline {
  --color-fg: var(--orb-color-text-primary);
  --color-fg-muted: var(--orb-color-text-secondary);
  --color-accent: var(--orb-color-accent);
  --radius-xl: var(--orb-radius-xl);
}
```

Orbit's CSS is unlayered, so it wins over Tailwind's `@layer base` preflight.

## Tokens in TypeScript

```ts
import { cssVar, themes, vars, contrastRatio } from "@orbit/tokens";

cssVar("color-accent"); // "var(--orb-color-accent)"
vars["glass-standard-bg"]; // typed map of every semantic token
themes.dark.tokens["color-text-primary"]; // raw value
contrastRatio("#122D4B", "#EAF6FC", "rgba(255,255,255,.7)"); // text on glass over a backdrop
```

## SSR

Components render on the server (`pnpm verify:package` server-renders the packed library). With `scope="document"`, attributes are applied in a layout effect, so put the initial `data-orbit-theme` on `<html>` in your server template.

## Next

- [Components](components.md) has an API overview of every export.
- [Theming](theming.md) covers custom themes and brand colours.
- [Accessibility](accessibility.md) and [Performance](performance.md) explain what's guaranteed and what's on you.
