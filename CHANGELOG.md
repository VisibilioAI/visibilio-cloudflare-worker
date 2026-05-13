# Changelog

All notable changes to this template repo follow [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

The version reported by `GET /api/content/version` matches the latest tag.

## [Unreleased]

### Changed

- Validator switched from AJV to `@cfworker/json-schema` — AJV compiles validators with `new Function()` which the Cloudflare Workers runtime blocks ("Code generation from strings disallowed"). `@cfworker/json-schema` is a pure-JS Draft 2020-12 interpreter built for the edge runtime. Same external behavior, no codegen.
- `wrangler` bumped to v4 — v3 bundler errored on the standard `import ... with { type: 'json' }` attribute syntax used by the validator.
- Unit-test glob narrowed to `tests/unit/**/*.test.ts` so the default `npm test` does not pick up integration tests.

### Added

- Integration test suite (`npm run test:integration`) that boots `wrangler pages dev` and exercises every endpoint over HTTP inside the real workerd runtime. KV is emulated locally by miniflare. 13 tests cover publish, dry-run, delete, schema/version discovery, and auth.
- New CI job `integration` running the workerd suite on every PR.

## [1.0.0] - 2026-05-13

### Added

- Initial scaffold of the Cloudflare Pages Functions template for the Visibilio publishing contract.
- Endpoints: `POST /api/content/` (publish + `?dry_run=true`), `DELETE /api/content/:slug`, `GET /api/content/schema`, `GET /api/content/version`.
- Vendored JSON Schema `schemas/cloudflare-article.v1.json` copied from `@visibilio/shared-types`.
- AJV-based runtime validation in the worker isolate.
- Bearer-token auth via `API_KEY` env var.
- KV-backed default storage adapter with `__index` summary key.
- `npm run vendor:schema` to re-vendor, `npm run vendor:check` as CI drift gate.
- GitHub Actions CI: typecheck, lint, unit tests, schema drift gate.

[Unreleased]: https://github.com/VisibilioAI/visibilio-cloudflare-worker/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/VisibilioAI/visibilio-cloudflare-worker/releases/tag/v1.0.0
