# Build & release

## Build outputs

| Package         | Command                                                                                                          | Output                                                           |
| --------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `@orbit/tokens` | `tsc` + `scripts/build-css.mjs`                                                                                  | `dist/index.js` + `.d.ts`, `dist/tokens.css`, `dist/tokens.json` |
| `@orbit/icons`  | `tsc`                                                                                                            | `dist/*.js` + `.d.ts`                                            |
| `@orbit/ui`     | `vite build` (ESM, `preserveModules`, deps externalised) + `tsc --emitDeclarationOnly` + `scripts/build-css.mjs` | `dist/**/*.js`, `dist/**/*.d.ts`, `dist/styles.css`              |
| Demo            | `vite build`                                                                                                     | `apps/showcase/dist` (static, deployable anywhere)               |
| Storybook       | `storybook build`                                                                                                | `apps/storybook/storybook-static` (static)                       |

`pnpm build` builds everything in dependency order.

## Release procedure

1. Make sure `main` is green: `pnpm check`.
2. Bump versions. Packages are versioned together:
   ```bash
   pnpm -r --filter "./packages/*" exec npm version <patch|minor|major> --no-git-tag-version
   ```
3. Update `CHANGELOG.md` (breaking changes first).
4. Build and verify the exact tarballs:
   ```bash
   pnpm build:packages
   pnpm verify:package
   ```
5. Publish. `workspace:*` ranges are rewritten to real versions, and `publishConfig.exports` drops the dev-only `orbit-source` condition:
   ```bash
   pnpm -r --filter "./packages/*" publish --access public
   ```
6. Tag: `git tag v<version> && git push --tags`.
7. Deploy `apps/showcase/dist` and `apps/storybook/storybook-static` to static hosting.

## Versioning policy

- **Tokens**: renaming or removing a semantic token is a major change. Changing a value is a minor change and must pass the contrast suite.
- **CSS classes** (`orb-*`) are an implementation detail. Consumers should style through props and tokens. Class changes are minor unless documented as public.
- **Visual baselines** are updated in the same PR as the visual change.

## Suggested CI pipeline

```yaml
- pnpm install --frozen-lockfile
- pnpm --filter @orbit/showcase exec playwright install --with-deps chromium
- pnpm format:check && pnpm lint && pnpm typecheck
- pnpm test
- pnpm build
- pnpm verify:package
- pnpm test:e2e
- pnpm test:visual # baselines generated on the CI image
```
