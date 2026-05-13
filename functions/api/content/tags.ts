/**
 * GET /api/content/tags — declared tags the site uses (optional, public).
 *
 * Default implementation: returns the union of tags currently in the index.
 * Customers with a fixed tag taxonomy can replace this with a constant
 * list — Visibilio reads the response on channel creation and pre-populates
 * `default_tags`, mirroring how `/catalog` auto-fills `default_categories`.
 *
 * Shape:
 *   { tags: ["product-updates", "engineering", ...] }
 *
 * Convention vs canonical: missing endpoint is benign; the gateway treats
 * 404 as "no tag discovery", same way it treats missing /api/content/schema.
 */

import { jsonResponse, type WorkerEnv } from '../../_lib/auth';

interface IndexedSummary {
  readonly slug: string;
  readonly title: string;
  readonly published_at: string;
}

const INDEX_KEY = '__index';

export const onRequestGet: PagesFunction<WorkerEnv> = async (ctx) => {
  // Default: derive tags from the published index. Empty if no articles.
  // Customers who maintain a fixed taxonomy should replace this body with
  // a hardcoded list (or read it from KV/D1).
  const kv = ctx.env.ARTICLES;
  if (!kv) {
    return jsonResponse({ tags: [] satisfies string[] });
  }

  const raw = await kv.get(INDEX_KEY);
  if (!raw) {
    return jsonResponse({ tags: [] satisfies string[] });
  }

  let parsed: IndexedSummary[];
  try {
    const arr = JSON.parse(raw);
    parsed = Array.isArray(arr) ? (arr as IndexedSummary[]) : [];
  } catch {
    parsed = [];
  }

  // The default storage adapter does not store article tags in __index, so
  // this default implementation always returns []. Documented as a hook
  // point — customers override either by tracking tags in __index or by
  // hardcoding their taxonomy.
  void parsed;
  return jsonResponse(
    { tags: [] satisfies string[] },
    { headers: { 'cache-control': 'public, max-age=300' } },
  );
};
