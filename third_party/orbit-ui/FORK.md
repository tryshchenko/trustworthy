# Orbit UI — vendored fork

Source: https://github.com/tryshchenko/orbit-ui (branch `main`), copied into this
repository because the packages are not published to npm.

Trustworthy consumes `@orbit/tokens`, `@orbit/icons` and `@orbit/ui` through the
root pnpm workspace. `@orbit/ui` and `@orbit/icons` are compiled from source via
the `orbit-source` export condition; only `@orbit/tokens` is built (it generates
`dist/tokens.css`).

## Local changes

Keep this list short and upstream what makes sense.

1. `packages/ui/src/components/product/Selectors.tsx` — `ProjectSwitcher` shows
   the project's `description` under its name instead of the hard-coded
   "Software project" (used to show each website's domain).

## Updating

Replace this directory with a newer upstream checkout, re-apply the changes
above, then run `pnpm install && pnpm build` at the repository root.
