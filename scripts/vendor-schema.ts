/**
 * Vendor the canonical JSON Schema artifact from `@visibilio/shared-types`
 * into `schemas/cloudflare-article.v1.json` inside this repo.
 *
 * Run this when bumping the schema (e.g. after a shared-types release):
 *   npm install @visibilio/shared-types@<new-version>
 *   npm run vendor:schema
 *   npm test
 *
 * CI runs `vendor:check` (not `vendor:schema`) — see scripts/check-vendored-schema.ts.
 * That script fails the build if the vendored copy drifts from the npm
 * package, preventing accidental hand-edits.
 *
 * For local development without npm publish (e.g. consuming shared-types
 * straight from a sibling working tree), set:
 *   SHARED_TYPES_SCHEMA_PATH=../visibilio-shared-types/dist/schemas/cloudflare-article.v1.json
 */

import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const DEST = resolve(process.cwd(), 'schemas/cloudflare-article.v1.json');

function resolveSource(): string {
  const override = process.env.SHARED_TYPES_SCHEMA_PATH;
  if (override) return resolve(process.cwd(), override);
  return resolve(
    process.cwd(),
    'node_modules/@visibilio/shared-types/dist/schemas/cloudflare-article.v1.json',
  );
}

const source = resolveSource();
if (!existsSync(source)) {
  console.error(`Source schema not found at:\n  ${source}`);
  console.error(
    'Hint: install @visibilio/shared-types or set SHARED_TYPES_SCHEMA_PATH to the canonical path.',
  );
  process.exit(1);
}

mkdirSync(dirname(DEST), { recursive: true });
copyFileSync(source, DEST);
console.log(`Vendored:\n  ${source}\n→ ${DEST}`);
