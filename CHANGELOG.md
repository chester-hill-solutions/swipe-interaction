# Changelog

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
