# Contributing

Thanks for contributing to `swipe-interaction`.

## Development

Requires Node `^22.22.2 || ^24.15.0 || >=26.0.0` (the floor set by `jsdom` and `undici` in the dev toolchain). Older versions install with a warning and may fail the test run. This applies to the toolchain only; the published package has no runtime dependencies and supports whatever your consumers' bundler targets.

```bash
npm install
npm test
npm run typecheck
npm run verify:exports
npm run demo:dev
```

## Pull requests

- Keep changes focused and backward compatible unless a major release is intentional.
- Add or update tests for behavior changes.
- Run `npm run verify:exports` before opening a PR so published ESM imports stay valid.
- Update `CHANGELOG.md` for user-visible changes.

## Releases

Releases are tag-driven:

```bash
git tag v0.2.0
git push origin v0.2.0
```

The release workflow publishes to npm when `NPM_TOKEN` is configured in repository secrets.
