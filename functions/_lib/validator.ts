/**
 * JSON Schema validator for incoming article payloads.
 *
 * The vendored schema lives in `schemas/cloudflare-article.v1.json` and is
 * the same artifact emitted by `@visibilio/shared-types`. The vendor-schema
 * script (and CI drift gate) keep them aligned at template release time.
 *
 * Ajv 2020-12 is used because the source schema declares Draft 2020-12.
 * Compilation happens once per worker isolate via the lazy `getValidator`
 * accessor — Cloudflare reuses the isolate across requests within a region,
 * so subsequent calls hit the compiled function.
 */

import Ajv2020 from 'ajv/dist/2020';
import type { ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import schemaJson from '../../schemas/cloudflare-article.v1.json' assert { type: 'json' };

export interface ValidationIssue {
  readonly path: string;
  readonly message: string;
  readonly keyword: string;
}

export type ValidationResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly issues: readonly ValidationIssue[] };

let compiled: ValidateFunction | null = null;

function getValidator(): ValidateFunction {
  if (compiled) return compiled;
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  compiled = ajv.compile(schemaJson as object);
  return compiled;
}

export function validateArticle(payload: unknown): ValidationResult {
  const v = getValidator();
  const ok = v(payload);
  if (ok) return { ok: true };
  const issues: ValidationIssue[] = (v.errors ?? []).map((e) => ({
    path: e.instancePath || (e.params as { missingProperty?: string }).missingProperty || '',
    message: e.message ?? 'invalid',
    keyword: e.keyword,
  }));
  return { ok: false, issues };
}

export function getSchema(): object {
  return schemaJson as object;
}
