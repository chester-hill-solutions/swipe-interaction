# Changelog

## Unreleased

- Bump `@jridgewell/sourcemap-codec` 1.5.5 to 1.6.0 in the lockfile. Dev-only and transitive (via `magic-string`, used by Vitest), so it does not affect the published package. The release is additive: same exports map, same entry points, and two new `decodeRangeMappings`/`encodeRangeMappings` functions.
- Pin the Node version used by CI to `22.23.3` via `.nvmrc`, and have all three workflows read it through `node-version-file` instead of a bare `node-version: 22`. Removes the silent drift where a new Node minor could break the toolchain without any change to the repo.
- Document the Node `^22.22.2 || ^24.15.0 || >=26.0.0` requirement for the development toolchain, and enforce it with `devEngines`. This is a contributor-facing constraint only: the published package has no runtime dependencies, so the `engines.node: ">=18"` range is unchanged and consumers are unaffected.

## 0.2.0

- Export `UseHorizontalSwipeGestureParams`, `SwipeThresholds`, and `useLeftSwipeRow`.
- Add `rightDragPxFromDx`, `dragDistanceForDirection`, and optional threshold overrides.
- Add lifecycle callbacks: `onSwipeStart`, `onSwipeCancel`, and `onDragChange`.
- Add `./gesture` subpath export for pure helper imports.
- Expand test coverage, React 18/19 CI matrix, release workflow, and Vite demo.

## 0.1.1

- Fix ESM build output to use explicit `.js` extensions in relative imports so Node and Vitest can resolve the published package without bundler aliases.

## 0.1.0

- Initial release.
