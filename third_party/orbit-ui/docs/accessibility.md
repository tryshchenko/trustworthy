# Accessibility

Target: **WCAG 2.2 AA**. Accessibility is a release requirement, so CI fails on regressions.

## How it's verified

| Layer      | Tooling                                                                                                                                                                                                                                  | What it proves                                                                                                                                                                                           |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tokens     | Vitest (`packages/tokens/src/contrast.test.ts`, 89 assertions)                                                                                                                                                                           | Every text token ≥ 4.5:1 on every opaque surface **and on every glass material composited over each theme's real backdrop colours**. Tone foregrounds on tone backgrounds, solid badges, accent buttons. |
| Components | Vitest + Testing Library + axe-core (`packages/ui/src/test`)                                                                                                                                                                             | Roles, names, descriptions, focus management, keyboard behaviour, no axe violations.                                                                                                                     |
| Stories    | Every Storybook story is rendered and axe-scanned in Vitest. Play functions exercise keyboard flows (`apps/storybook/stories/stories.test.tsx`). The Storybook a11y panel runs axe live.                                                 |                                                                                                                                                                                                          |
| End-to-end | Playwright + `@axe-core/playwright` (WCAG 2.0–2.2 A/AA tags, **including colour contrast on the real rendered translucent UI**) in all four themes, with the inspector open, on mobile, in settings and in the issues and overview views |                                                                                                                                                                                                          |

## Guarantees provided by the components

- **Focus**: one 2px focus outline token, visible in all themes and Windows forced-colours mode.
- **Landmarks**: `AppShell` renders a skip link, `<nav>` (sidebar), `<header>` (banner), `<main>` and an optional complementary inspector.
- **Overlays**: Radix-based dialogs, drawers, menus, popovers and selects trap or manage focus, close on Escape and return focus to the trigger.
- **Inspector**: non-modal on desktop. Focus moves into it and back on close, without trapping, so the board stays operable. Modal and full-screen on mobile.
- **Drag-and-drop**: keyboard dragging (Space to lift, arrows to move, Space to drop, Escape to cancel) with live announcements naming the card, column and position. Focus is restored to the card after a keyboard drop. Every card also has a **non-drag alternative** (WCAG 2.5.7): a "Move to…" menu in the demo, and a status selector in the inspector.
- **Cards**: one focusable surface per card. Name = key + title. Description = type, priority, assignee, labels, estimate, due date.
- **Status**: always text + distinct glyph shape + colour (`StatusPill`, `PriorityIndicator`, column headers).
- **Forms**: `Field` links label, help and error. Errors are announced (`role="alert"`), set `aria-invalid`, and focus moves to the first invalid field on submit.
- **Live regions**: toasts, filter result counts, combobox result counts, Kanban announcements, DataGrid sort changes.
- **Timing**: toasts pause on hover and focus, and can be dismissed with Escape or a button.
- **Motion and transparency**: honour user preferences, and can be toggled per app.
- **Targets**: ≥ 24×24px in compact density.

## Your responsibilities as a consumer

- Give `IconButton` a meaningful `label`, and `Select`/`Combobox` outside a `Field` an `aria-label`.
- Provide a non-drag alternative when you build your own board items (expose `onMoveItem` through a menu or selector).
- Keep translucent surfaces on Orbit's materials. Don't put body text directly on `AeroBackground` imagery.
- If you add a theme, run `pnpm test`. The contrast suite covers it automatically.

## Known gaps

- `Combobox`/`DatePicker` triggers are `<button>`s. Invalid state is conveyed through the linked error message rather than `aria-invalid`, which ARIA doesn't support on buttons.
- Automated tests run in Chromium only. Screen-reader behaviour was verified via the accessibility tree and announcements, not with VoiceOver/NVDA sessions.
