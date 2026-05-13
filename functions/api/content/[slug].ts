/**
 * DELETE /api/content/:slug — unpublish an article.
 *
 * Returns 204 on success, 404 when the slug does not exist. Idempotent at
 * the protocol level: clients can safely retry.
 */

import { requireBearer, jsonResponse, type WorkerEnv } from '../../_lib/auth';
import { deleteArticle } from '../../_lib/storage';

export const onRequestDelete: PagesFunction<WorkerEnv, 'slug'> = async (ctx) => {
  const authError = requireBearer(ctx.request, ctx.env);
  if (authError) return authError;

  const slug = ctx.params.slug;
  if (typeof slug !== 'string' || !slug) {
    return jsonResponse({ ok: false, error: 'Missing slug' }, { status: 400 });
  }

  try {
    const removed = await deleteArticle(ctx.env, slug);
    if (!removed) {
      return jsonResponse({ ok: false, error: 'Article not found' }, { status: 404 });
    }
    return new Response(null, { status: 204 });
  } catch (err) {
    return jsonResponse(
      {
        ok: false,
        error: 'Storage delete failed',
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
};
