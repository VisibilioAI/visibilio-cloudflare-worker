/**
 * GET /api/content/schema — return the JSON Schema this worker validates against.
 *
 * Public endpoint (no auth required). Lets the Visibilio gateway, customer
 * tools, or external integrators discover the contract without scraping the
 * template repo. Always reflects the vendored schema at deploy time —
 * `npm run vendor:schema` keeps it in sync with `@visibilio/shared-types`.
 */

import { jsonResponse, type WorkerEnv } from '../../_lib/auth';
import { getSchema } from '../../_lib/validator';

export const onRequestGet: PagesFunction<WorkerEnv> = () =>
  jsonResponse(getSchema(), {
    headers: { 'cache-control': 'public, max-age=300' },
  });
