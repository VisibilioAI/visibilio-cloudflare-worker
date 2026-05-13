# Changelog

All notable changes to this template repo follow [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

The version reported by `GET /api/content/version` matches the latest tag.

## [Unreleased]

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
