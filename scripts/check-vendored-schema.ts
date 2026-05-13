/**
 * CI drift gate — fail when the vendored schema diverges from the canonical
 * `@visibilio/shared-types` package.
 *
 * The vendored file is the runtime source of truth at the edge, but
 * hand-edits are easy to accidentally introduce. This script computes a
 * canonical (sorted-keys) JSON form of both and compares — equal contents
 * pass, any difference fails with a hint about how to fix.
 *
 * Honors `SHARED_TYPES_SCHEMA_PATH` for sibling-working-tree development.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const VENDORED = resolve(process.cwd(), 'schemas/cloudflare-article.v1.json');

function resolveCanonical(): string {
  const override = process.env.SHARED_TYPES_SCHEMA_PATH;
  if (override) return resolve(process.cwd(), override);
  return resolve(
    process.cwd(),
    'node_modules/@visibilio/shared-types/dist/schemas/cloudflare-article.v1.json',
  );
}

const canonical = resolveCanonical();

if (!existsSync(VENDORED)) {
  console.error(`Vendored schema missing: ${VENDORED}`);
  process.exit(1);
}
if (!existsSync(canonical)) {
  console.warn(
    `Canonical schema not found at ${canonical} — skipping drift check.\n` +
      'Set SHARED_TYPES_SCHEMA_PATH or `npm install @visibilio/shared-types` to enable.',
  );
  process.exit(0);
}

function normalize(text: string): string {
  return JSON.stringify(sortKeys(JSON.parse(text)));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    const sorted: Record<string, unknown> = {};
    for (const k of Object.keys(value as object).sort()) {
      sorted[k] = sortKeys((value as Record<string, unknown>)[k]);
    }
    return sorted;
  }
  return value;
}

const vendoredText = normalize(readFileSync(VENDORED, 'utf8'));
const canonicalText = normalize(readFileSync(canonical, 'utf8'));

if (vendoredText === canonicalText) {
  console.log('Vendored schema matches canonical @visibilio/shared-types ✓');
  process.exit(0);
}

console.error(
  'Vendored schema has drifted from the canonical @visibilio/shared-types artifact.',
);
console.error('Fix:');
console.error('  npm run vendor:schema');
console.error('  git add schemas/cloudflare-article.v1.json && git commit');
process.exit(1);
