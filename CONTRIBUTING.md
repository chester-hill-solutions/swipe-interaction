# Contributing

Thanks for contributing to `swipe-interaction`.

## Development

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
