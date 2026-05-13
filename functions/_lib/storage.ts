/**
 * Storage adapter for published articles.
 *
 * Default implementation: Cloudflare KV (binding name `ARTICLES`).
 * Swap this file for D1 or R2 if you need richer queries or larger payloads.
 *
 * Article keys are the article slug. The `__index` key holds a JSON array of
 * { slug, published_at, title } entries so the worker can answer "list
 * articles" without scanning all KV keys (which is paginated and slow).
 *
 * The index update is best-effort; if the article writes succeed but the
 * index update fails, the article is still retrievable by slug. The next
 * write or a manual `wrangler kv:key put __index ...` will reconcile.
 */

import type { WorkerEnv } from './auth';

export interface StoredArticleSummary {
  readonly slug: string;
  readonly title: string;
  readonly published_at: string;
}

const INDEX_KEY = '__index';

function requireKv(env: WorkerEnv): KVNamespace {
  if (!env.ARTICLES) {
    throw new Error(
      'ARTICLES KV namespace is not bound. See wrangler.toml — uncomment the ' +
        'kv_namespaces section and run `wrangler kv:namespace create ARTICLES`.',
    );
  }
  return env.ARTICLES;
}

export async function putArticle(
  env: WorkerEnv,
  slug: string,
  payload: unknown,
  summary: StoredArticleSummary,
): Promise<void> {
  const kv = requireKv(env);
  await kv.put(slug, JSON.stringify(payload));
  await updateIndex(kv, (entries) => {
    const next = entries.filter((e) => e.slug !== slug);
    next.unshift(summary);
    return next;
  });
}

export async function deleteArticle(env: WorkerEnv, slug: string): Promise<boolean> {
  const kv = requireKv(env);
  const existing = await kv.get(slug);
  if (existing === null) return false;
  await kv.delete(slug);
  await updateIndex(kv, (entries) => entries.filter((e) => e.slug !== slug));
  return true;
}

async function updateIndex(
  kv: KVNamespace,
  mutate: (entries: StoredArticleSummary[]) => StoredArticleSummary[],
): Promise<void> {
  const raw = await kv.get(INDEX_KEY);
  const current: StoredArticleSummary[] = raw ? safeParseArray(raw) : [];
  const next = mutate(current);
  await kv.put(INDEX_KEY, JSON.stringify(next));
}

function safeParseArray(raw: string): StoredArticleSummary[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredArticleSummary[]) : [];
  } catch {
    return [];
  }
}
