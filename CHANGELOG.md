# Changelog

All notable changes to this template repo follow [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

The version reported by `GET /api/content/version` matches the latest tag.

## [Unreleased]

### Added

- **`GET /api/content/catalog`** — authenticated endpoint listing published articles (`{ slug, title, published_at, primary_category? }`) and the distinct categories they use (`categories: string[]`). The Visibilio gateway reads it on channel creation to auto-fill `default_categories`, and uses the same round-trip as a connection check. Auth-gated (Bearer `API_KEY`): a missing or wrong token is `401`; an unbound or empty KV returns an empty catalog with `200`. Derived from the `__index` summary and each article's stored `categorization` — no extra storage. Customers with a fixed taxonomy can replace the body with a hardcoded list.
- **Tier 3 CI: real Cloudflare Pages preview deploy + smoke**. New workflow `.github/workflows/deploy-preview.yml` deploys each PR to a `*.pages.dev` URL on the `visibilio-cloudflare-worker-ci` Pages project, then runs `npm run test:integration` against the live URL. Catches the small class of issues that workerd-via-`wrangler-pages-dev` misses: bundle errors at deploy time, real KV namespace binding, edge propagation, DNS. Gated on `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` repository secrets — if absent the job cleanly skips, so contributors without secret access (forks) still get green CI.
- **`tests/integration/setup.ts` external mode**. When `WORKER_BASE_URL` is set in the environment, the globalSetup skips `wrangler pages dev` and runs the existing suite against the provided URL — used by Tier 3 but also handy for local point-tests against a staging deployment.

## [1.1.0] - 2026-05-13

### Added

- **`GET /api/content/tags`** — public endpoint listing tags the site uses. Default implementation returns `[]`. Customers with a fixed taxonomy can replace the body with a hardcoded list. The Visibilio gateway reads this on channel creation and pre-populates `default_tags` (mirrors `/catalog` behavior for categories).
- **`extensions` field** in the article payload (schema v1.1.0) — optional object with arbitrary site-specific fields (premium flags, custom layout hints, author bio overrides). Worker stores the value verbatim; the gateway and template do not interpret keys. Backwards-compatible: legacy payloads without `extensions` still validate.
- **Capability flags** in `GET /api/content/version` response — `{ capabilities: ["dry_run", "tags_discovery"] }`. Lets the gateway feature-detect template behavior beyond version-string heuristics.

### Changed

- `template_version` default bumped `1.0.0` → `1.1.0`.

## [1.0.0] - 2026-05-13 (re-released as part of this changelog reorg)

### Changed (from earlier unreleased)

- Validator switched from AJV to `@cfworker/json-schema` — AJV compiles validators with `new Function()` which the Cloudflare Workers runtime blocks ("Code generation from strings disallowed"). `@cfworker/json-schema` is a pure-JS Draft 2020-12 interpreter built for the edge runtime. Same external behavior, no codegen.
- `wrangler` bumped to v4 — v3 bundler errored on the standard `import ... with { type: 'json' }` attribute syntax used by the validator.
- Unit-test glob narrowed to `tests/unit/**/*.test.ts` so the default `npm test` does not pick up integration tests.

### Added (from earlier unreleased)

- Integration test suite (`npm run test:integration`) that boots `wrangler pages dev` and exercises every endpoint over HTTP inside the real workerd runtime. KV is emulated locally by miniflare. 13 tests cover publish, dry-run, delete, schema/version discovery, and auth.
- New CI job `integration` running the workerd suite on every PR.

## [1.0.0-initial] - 2026-05-13

### Added

- Initial scaffold of the Cloudflare Pages Functions template for the Visibilio publishing contract.
- Endpoints: `POST /api/content/` (publish + `?dry_run=true`), `DELETE /api/content/:slug`, `GET /api/content/schema`, `GET /api/content/version`.
- Vendored JSON Schema `schemas/cloudflare-article.v1.json` copied from `@visibilio/shared-types`.
- AJV-based runtime validation in the worker isolate.
- Bearer-token auth via `API_KEY` env var.
- KV-backed default storage adapter with `__index` summary key.
- `npm run vendor:schema` to re-vendor, `npm run vendor:check` as CI drift gate.
- GitHub Actions CI: typecheck, lint, unit tests, schema drift gate.

[Unreleased]: https://github.com/VisibilioAI/visibilio-cloudflare-worker/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/VisibilioAI/visibilio-cloudflare-worker/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/VisibilioAI/visibilio-cloudflare-worker/releases/tag/v1.0.0
