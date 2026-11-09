# Deployment-only overrides (intentionally uncommitted)

This repo is the customer-facing template. Some values that a real deployment
needs are environment-specific and deliberately never committed — the local
working tree may carry them, `origin/main` must not.

## KV namespace binding (wrangler.toml)

The kondevs.com production deployment binds the ARTICLES KV namespace:

    [[kv_namespaces]]
    binding = "ARTICLES"
    id = "a61d738091a04fdc98e45f7c2eae7e65"

That id lives only in the deployment's local `wrangler.toml`. The template's
committed copy keeps the commented placeholder (`REPLACE_WITH_YOUR_KV_NAMESPACE_ID`),
per the customer steps in the file header. If your working tree shows
`wrangler.toml` modified, this binding is the expected — and only — reason;
do not commit it.

## What WAS folded back

The other two deploy-only patches from the 2026-11 handover are real template
behavior and have been committed (probe parity with the kondevs.com
deployment):

- `functions/api/content/index.ts` — GET on the collection answers 405 with an
  `allow` header, so connectivity probes don't read a 404 as a missing
  Content API.
- `functions/api/content/version.ts` — the version payload also carries
  `status: "ok"` and `version`, the fields the gateway's connectivity probe
  looks for.
