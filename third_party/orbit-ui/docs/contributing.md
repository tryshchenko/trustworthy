# Contributing

## Repository layout

```text
orbit/
├── apps/
│   ├── showcase/        Orbit Projects demo (Vite + Tailwind v4) + Playwright e2e/visual tests
│   └── storybook/       Storybook 9 (design workspace) + story interaction tests
├── packages/
│   ├── tokens/          src/{primitives,themes,density,contrast}.ts → dist/tokens.css, tokens.json, typed TS
│   ├── icons/           Lucide re-export + Orbit glyphs
│   └── ui/              src/components/{foundation,aero,product}, src/styles/*.css, src/test
├── docs/                Guides (tokens.md is generated)
└── scripts/             verify-package.mjs, generate-token-docs.mjs
```

Package boundaries: `ui` depends on `tokens` and `icons`. Apps depend on packages. **Packages never import from apps**, and the demo never re-implements a component. If the demo needs something reusable, add it to `@orbit/ui`.

## Development loop

```bash
pnpm install
pnpm storybook      # design + build components here first
pnpm dev            # see them in the real app
```

In dev, Vite and Storybook resolve workspace packages to their **TypeScript source** through the custom `orbit-source` export condition, so edits hot-reload without rebuilding. Production builds, e2e tests and `verify:package` use the compiled `dist/`, exactly as external consumers do. (`tokens.css` is generated, so run `pnpm build:tokens` after editing tokens. `pnpm dev` and `pnpm storybook` do this for you.)

## Adding a component

1. Pick the layer: `foundation` (generic), `aero` (signature/material), `product` (project-management, presentational).
2. Write `Component.tsx`: `forwardRef`, typed `ComponentProps`, `className` passthrough, controlled and uncontrolled where stateful (`useControllableState`), Radix primitives for complex interaction.
3. Style it in `src/styles/<layer>.css` with `orb-` classes, **semantic tokens only** (no hex values), density tokens for sizes, and duration/easing tokens for motion.
4. Export it from `src/index.ts`.
5. Add a story file in `apps/storybook/stories/` with realistic data, all relevant states and a `play` function for its key interaction. It's tested and axe-scanned automatically.
6. Add focused unit tests in `packages/ui/src/test/` for behaviour that stories don't cover.
7. Update `docs/components.md`.

## Quality gates

| Command               | Must pass                                                                                 |
| --------------------- | ----------------------------------------------------------------------------------------- |
| `pnpm format:check`   | Prettier                                                                                  |
| `pnpm lint`           | ESLint: typescript-eslint, react-hooks, jsx-a11y (disables need a justification comment)  |
| `pnpm typecheck`      | Strict TS (`noUncheckedIndexedAccess`, `verbatimModuleSyntax`)                            |
| `pnpm test`           | Token contrast, unit and story interaction tests                                          |
| `pnpm build`          | All packages, demo and Storybook                                                          |
| `pnpm verify:package` | Consumer type-check + SSR of the packed tarballs                                          |
| `pnpm test:e2e`       | Playwright flows, axe in all themes, web vitals                                           |
| `pnpm test:visual`    | Visual regression (update deliberately with `-- --update-snapshots` and review the diffs) |

`pnpm check` runs all of these in order.

## Design review checklist

Before merging a visual change, open it in Storybook with **All themes side by side** and check:

- Does it follow 70/20/10? Is glass only on chrome?
- Is text on translucent surfaces still ≥ 4.5:1? (Add a token test if you introduced a new pairing.)
- Does it work in compact density, reduced transparency and the mobile viewport?
- Is there a keyboard path, and does focus stay visible?

## Commit style

Conventional commits (`feat(ui): …`, `fix(tokens): …`, `docs: …`). Note visual-baseline updates explicitly in the PR description.
