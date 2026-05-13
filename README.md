# visibilio-cloudflare-worker

A Cloudflare Pages Functions template for sites that want to receive published content from [Visibilio](https://visibilio.ai). Clone, set your API key, deploy — Visibilio can then publish articles to your site over HTTPS without any custom backend code on your end.

This template implements the rich payload contract documented in [`@visibilio/shared-types`](https://github.com/VisibilioAI/visibilio-shared-types/tree/main/src/publishing). The JSON Schema lives at [`schemas/cloudflare-article.v1.json`](schemas/cloudflare-article.v1.json) and is served live by your worker at `GET /api/content/schema`.

## Quick start

```bash
# 1. Clone the template (pinned to the latest stable tag)
git clone --depth 1 --branch v1.0.0 https://github.com/VisibilioAI/visibilio-cloudflare-worker.git my-site-worker
cd my-site-worker

# 2. Install dependencies
npm ci

# 3. Create a Cloudflare Pages project (one-time)
npx wrangler pages project create my-site-worker

# 4. Provision the KV namespace and paste the ID into wrangler.toml
npx wrangler kv:namespace create ARTICLES

# 5. Set your shared secret (this is the token Visibilio will send)
npx wrangler pages secret put API_KEY --project-name my-site-worker

# 6. Deploy
npm run deploy
```

Capture the worker URL printed by `wrangler pages deploy`. In Visibilio's dashboard:

1. **Content Hubs → Add Hub → Custom API**
2. Set `api_url` to `https://<your-domain>/api/content/`
3. Set `api_key` to the value you set in step 5
4. Set `site_url` to your public domain
5. Add per-customer `category_mapping` + `default_category` if your site uses a fixed taxonomy
6. Hit **Test publish** — the wizard runs `POST /api/content/?dry_run=true` against your worker before saving the channel

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/content/` | Publish: validate payload → persist → return slug + live URL |
| `POST` | `/api/content/?dry_run=true` | Validate only, do not persist |
| `DELETE` | `/api/content/:slug` | Unpublish (returns 204 on success, 404 if slug missing) |
| `GET` | `/api/content/schema` | Return the JSON Schema this worker validates against |
| `GET` | `/api/content/version` | Return `{ template_version, schema_id }` |

All write endpoints require `Authorization: Bearer <API_KEY>`. Read endpoints are public.

## Storage

The default storage adapter uses Cloudflare KV (binding `ARTICLES`). Each article is written under its slug; a `__index` key holds a JSON array of recent publications so you can list articles without scanning all KV keys.

If you prefer D1 (relational), R2 (objects), or a custom backend, edit [`functions/_lib/storage.ts`](functions/_lib/storage.ts) — it is the single point of integration. The endpoint handlers are agnostic to where you store the data.

## Schema lifecycle

The JSON Schema is **vendored** at build time: a copy lives in `schemas/cloudflare-article.v1.json` inside this repo. The canonical source is [`@visibilio/shared-types`](https://www.npmjs.com/package/@visibilio/shared-types).

### Updating the schema after a `@visibilio/shared-types` release

```bash
npm install @visibilio/shared-types@<new-version>
npm run vendor:schema
npm test
git commit -am "chore: vendor schema vX.Y.Z"
```

CI runs `npm run vendor:check` on every PR — if the vendored file drifts from the canonical npm package, the build fails with a fix-it hint. This prevents hand-edits to the schema, which would silently desync from the gateway's contract.

### Local development against a sibling working tree

If you have `visibilio-shared-types` checked out next to this repo, point the vendor scripts at it:

```bash
SHARED_TYPES_SCHEMA_PATH=../visibilio-shared-types/dist/schemas/cloudflare-article.v1.json npm run vendor:schema
```

## Versioning

This template follows [SemVer](https://semver.org/spec/v2.0.0.html). The `GET /api/content/version` endpoint reports the major.minor.patch your deployment was built against.

- **Major** — breaking schema change (e.g. new required field). We maintain the previous major in a `vN.x` branch for security patches.
- **Minor** — additive change (new optional field, new endpoint).
- **Patch** — bugfix (validation behavior, error messages, dependency updates).

When Visibilio's gateway upgrades to a new major version of the contract, it surfaces a "Template out of date" prompt to operators of workers reporting older `template_version` values; the integration keeps working until you upgrade.

## Customization

You can edit anything in this template — it's a starting point, not a framework. The pieces most worth understanding before changing:

- [`functions/_lib/validator.ts`](functions/_lib/validator.ts) — `@cfworker/json-schema` Validator is built once per worker isolate (Workers runtime blocks AJV's `new Function()` codegen path). Mutating the schema at runtime is unsupported — re-vendor instead.
- [`functions/_lib/auth.ts`](functions/_lib/auth.ts) — Bearer-token auth with constant-time comparison. If you switch to mTLS or another scheme, keep the same handler interface so the endpoints don't need to change.
- [`functions/_lib/storage.ts`](functions/_lib/storage.ts) — the only file that knows where articles live.
- [`functions/api/content/*.ts`](functions/api/content) — handler files. Cloudflare Pages routes them automatically by filename; do not rename without updating `wrangler.toml`.

## Testing

```bash
npm test                # vitest, unit tests (Node, fast)
npm run test:integration # vitest, integration tests inside workerd (slower, real runtime)
npm run typecheck       # tsc strict, no emit
npm run lint            # eslint over functions/, tests/, scripts/
```

The integration suite spins up `wrangler pages dev` once, then exercises every endpoint over HTTP against the actual Cloudflare Workers runtime (workerd) with miniflare-emulated KV. This catches issues unit tests cannot — Node-only API usage, Pages Functions routing, module loading semantics, Wrangler bundling, KV behavior.

Both suites run in CI on every PR.

Run `npm run dev` to bring up `wrangler pages dev` locally; set `API_KEY` in a `.dev.vars` file (gitignored) before testing publish.

## License

MIT — see [`LICENSE`](LICENSE).

## Support

- Schema or contract questions → [`visibilio-docs/Cloudflare_Publishing.md`](https://github.com/VisibilioAI/visibilio-docs/blob/main/Cloudflare_Publishing.md)
- Template bugs / feature requests → [Issues](https://github.com/VisibilioAI/visibilio-cloudflare-worker/issues)
- Visibilio platform support → in-app chat
