/**
 * GET /api/content/catalog — the authenticated catalog of published articles
 * and the categories they use.
 *
 * Auth-gated (Bearer API_KEY), unlike the public `version`/`schema`/`tags`
 * endpoints. The Visibilio gateway reads this on channel creation to auto-fill
 * `default_categories` and uses the same round-trip as a connection check, so a
 * missing or wrong token must be 401, never an empty 200.
 *
 * Shape (what the gateway consumes):
 *   {
 *     categories: ["Engineering", "Operations", ...],   // distinct, first-seen order
 *     articles:   [{ slug, title, published_at, primary_category? }, ...],
 *     total:      number
 *   }
 *
 * Categories are strings: in this template a category name is its own slug, so
 * the gateway's display-name -> slug mapping is an identity. Customers with a
 * fixed taxonomy can replace the body with a hardcoded list.
 *
 * Reads the `__index` summary, then each article's stored `categorization`
 * (the same KV layout `tags.ts` and the publish handler use). An unbound or
 * empty KV returns an empty catalog with 200 so the connection check still
 * passes on a freshly deployed, not-yet-populated site.
 */

import { requireBearer, jsonResponse, type WorkerEnv } from '../../_lib/auth';

const INDEX_KEY = '__index';

interface IndexedSummary {
  readonly slug: string;
  readonly title: string;
  readonly published_at: string;
}

interface CatalogArticle extends IndexedSummary {
  readonly primary_category?: string;
}

export const onRequestGet: PagesFunction<WorkerEnv> = async (ctx) => {
  const authError = requireBearer(ctx.request, ctx.env);
  if (authError) return authError;

  const kv = ctx.env.ARTICLES;
  if (!kv) {
    return jsonResponse({
      categories: [] as string[],
      articles: [] as CatalogArticle[],
      total: 0,
    });
  }

  const summaries = await readIndexSummaries(kv);
  const categories: string[] = [];
  const seen = new Set<string>();
  const articles: CatalogArticle[] = [];

  for (const summary of summaries) {
    const primaryCategory = await readPrimaryCategory(kv, summary.slug);
    if (primaryCategory && !seen.has(primaryCategory)) {
      seen.add(primaryCategory);
      categories.push(primaryCategory);
    }
    articles.push(
      primaryCategory ? { ...summary, primary_category: primaryCategory } : summary,
    );
  }

  return jsonResponse(
    { categories, articles, total: articles.length },
    { headers: { 'cache-control': 'private, max-age=60' } },
  );
};

async function readIndexSummaries(kv: KVNamespace): Promise<IndexedSummary[]> {
  const raw = await kv.get(INDEX_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as IndexedSummary[]) : [];
  } catch {
    return [];
  }
}

async function readPrimaryCategory(kv: KVNamespace, slug: string): Promise<string | null> {
  const raw = await kv.get(slug);
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (parsed === null || typeof parsed !== 'object') return null;

  const categorization = (parsed as Record<string, unknown>)['categorization'];
  if (categorization === null || typeof categorization !== 'object') return null;

  const primaryCategory = (categorization as Record<string, unknown>)['primary_category'];
  return typeof primaryCategory === 'string' && primaryCategory.length > 0
    ? primaryCategory
    : null;
}
