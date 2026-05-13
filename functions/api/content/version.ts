/**
 * GET /api/content/version — report the template version this deployment
 * was built from.
 *
 * Public endpoint. Lets the Visibilio gateway negotiate behavior per
 * deployed version (e.g. show "Template out of date" prompts to operators
 * when major versions drift from the gateway's known good).
 */

import { jsonResponse, type WorkerEnv } from '../../_lib/auth';

export const onRequestGet: PagesFunction<WorkerEnv> = (ctx) =>
  jsonResponse({
    template_version: ctx.env.TEMPLATE_VERSION ?? '1.1.0',
    schema_id: 'https://visibilio.ai/schemas/cloudflare-article.v1.json',
    /** Capability flags read by the Visibilio gateway during channel
     *  onboarding. Listing a capability here means the corresponding
     *  endpoint exists on this template version. */
    capabilities: ['dry_run', 'tags_discovery'],
  });
