/**
 * JSON Schema validator for incoming article payloads.
 *
 * The vendored schema lives in `schemas/cloudflare-article.v1.json` and is
 * the same artifact emitted by `@visibilio/shared-types`. The vendor-schema
 * script (and CI drift gate) keep them aligned at template release time.
 *
 * Implementation note — Workers runtime constraint:
 *   AJV's default mode compiles validators with `new Function()`, which
 *   workerd blocks ("Code generation from strings disallowed"). We use
 *   @cfworker/json-schema instead — a pure-JS Draft 2020-12 interpreter
 *   designed for the Cloudflare runtime. Slightly slower than AJV in Node,
 *   but no codegen and far smaller bundle. One Validator instance is built
 *   per isolate (lazily) and reused across requests.
 */

import { Validator } from '@cfworker/json-schema';
import schemaJson from '../../schemas/cloudflare-article.v1.json' with { type: 'json' };

export interface ValidationIssue {
  readonly path: string;
  readonly message: string;
  readonly keyword: string;
}

export type ValidationResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly issues: readonly ValidationIssue[] };

let validatorInstance: Validator | null = null;

function getValidator(): Validator {
  if (validatorInstance) return validatorInstance;
  validatorInstance = new Validator(schemaJson as object, '2020-12');
  return validatorInstance;
}

export function validateArticle(payload: unknown): ValidationResult {
  const v = getValidator();
  const result = v.validate(payload);
  if (result.valid) return { ok: true };
  const issues: ValidationIssue[] = result.errors.map((e) => ({
    path: e.instanceLocation || '',
    message: e.error ?? 'invalid',
    keyword: e.keyword ?? '',
  }));
  return { ok: false, issues };
}

export function getSchema(): object {
  return schemaJson as object;
}
