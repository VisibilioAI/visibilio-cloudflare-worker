/**
 * POST /api/content/         — publish an article (validate + persist)
 * POST /api/content/?dry_run=true — validate only, do not persist
 *
 * The Visibilio gateway hits this endpoint with a payload that conforms to
 * `schemas/cloudflare-article.v1.json`. The handler validates first; if
 * dry_run is set, it returns the validation result without writing anywhere.
 */

import { requireBearer, jsonResponse, type WorkerEnv } from '../../_lib/auth';
import { validateArticle, type ValidationIssue } from '../../_lib/validator';
import { putArticle } from '../../_lib/storage';

interface ArticlePayload {
  readonly slug: string;
  readonly title: string;
  readonly published_at: string;
}

export const onRequestOptions: PagesFunction = () =>
  new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'authorization, content-type',
    },
  });

export const onRequestPost: PagesFunction<WorkerEnv> = async (ctx) => {
  const authError = requireBearer(ctx.request, ctx.env);
  if (authError) return authError;

  const url = new URL(ctx.request.url);
  const dryRun = url.searchParams.get('dry_run') === 'true';

  let payload: unknown;
  try {
    payload = await ctx.request.json();
  } catch {
    return jsonResponse(
      { ok: false, error: 'Request body is not valid JSON' },
      { status: 400 },
    );
  }

  const validation = validateArticle(payload);
  if (!validation.ok) {
    return jsonResponse(
      { ok: false, error: 'Schema validation failed', issues: validation.issues },
      { status: 400 },
    );
  }

  if (dryRun) {
    return jsonResponse({ ok: true, dry_run: true, issues: [] satisfies ValidationIssue[] });
  }

  const article = payload as ArticlePayload;
  try {
    await putArticle(ctx.env, article.slug, article, {
      slug: article.slug,
      title: article.title,
      published_at: article.published_at,
    });
  } catch (err) {
    return jsonResponse(
      {
        ok: false,
        error: 'Storage write failed',
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }

  const liveUrl = `${url.origin}/content-hub/${article.slug}`;
  return jsonResponse(
    { ok: true, slug: article.slug, url: liveUrl },
    { status: 201 },
  );
};
