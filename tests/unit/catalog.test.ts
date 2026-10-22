/**
 * GET /api/content/catalog — authenticated catalog of published articles and
 * their categories, used by the Visibilio gateway for category discovery and
 * as a connection check. Auth-gated: a valid Bearer returns the catalog; a
 * missing or wrong token is 401.
 */

import { describe, it, expect } from 'vitest';

import { onRequestGet } from '../../functions/api/content/catalog';
import type { WorkerEnv } from '../../functions/_lib/auth';

const API_KEY = 'secret-key';

interface Summary {
  slug: string;
  title: string;
  published_at: string;
}

function makeEnv(seed: Record<string, string> = {}): WorkerEnv {
  const store = new Map<string, string>(Object.entries(seed));
  const kv = {
    get: async (key: string) => store.get(key) ?? null,
    put: async (key: string, value: string) => {
      store.set(key, value);
    },
    delete: async (key: string) => {
      store.delete(key);
    },
  } as unknown as KVNamespace;
  return { API_KEY, ARTICLES: kv };
}

function envWithoutKv(): WorkerEnv {
  return { API_KEY };
}

function makeCtx(
  env: WorkerEnv,
  opts: { authed?: boolean; token?: string } = {},
): Parameters<typeof onRequestGet>[0] {
  const headers: Record<string, string> = {};
  if (opts.authed !== false) headers.authorization = `Bearer ${opts.token ?? API_KEY}`;
  return {
    request: new Request('https://example.com/api/content/catalog', { method: 'GET', headers }),
    env,
    params: {},
  } as unknown as Parameters<typeof onRequestGet>[0];
}

function articleJson(primaryCategory: string): string {
  return JSON.stringify({
    title: 't',
    categorization: { primary_category: primaryCategory, tags: [] },
  });
}

function indexJson(...summaries: Summary[]): string {
  return JSON.stringify(summaries);
}

describe('GET /api/content/catalog', () => {
  it('rejects an unauthenticated request with 401', async () => {
    const res = (await onRequestGet(makeCtx(makeEnv(), { authed: false }))) as Response;
    expect(res.status).toBe(401);
  });

  it('rejects an invalid bearer token with 401', async () => {
    const res = (await onRequestGet(makeCtx(makeEnv(), { token: 'wrong-key' }))) as Response;
    expect(res.status).toBe(401);
  });

  it('returns an empty catalog (200) when authed and nothing is published', async () => {
    const res = (await onRequestGet(makeCtx(makeEnv()))) as Response;
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      categories: string[];
      articles: unknown[];
      total: number;
    };
    expect(body).toEqual({ categories: [], articles: [], total: 0 });
  });

  it('returns distinct categories and article summaries for published articles', async () => {
    const env = makeEnv({
      __index: indexJson(
        { slug: 'a', title: 'A', published_at: '2026-01-02T00:00:00Z' },
        { slug: 'b', title: 'B', published_at: '2026-01-01T00:00:00Z' },
      ),
      a: articleJson('Engineering'),
      b: articleJson('Engineering'),
    });

    const res = (await onRequestGet(makeCtx(env))) as Response;

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      categories: string[];
      articles: Array<{ slug: string; title: string; primary_category?: string }>;
      total: number;
    };
    expect(body.categories).toEqual(['Engineering']);
    expect(body.total).toBe(2);
    expect(body.articles.map((a) => a.slug)).toEqual(['a', 'b']);
    expect(body.articles[0]?.primary_category).toBe('Engineering');
  });

  it('returns an empty catalog (200) when the ARTICLES KV namespace is unbound', async () => {
    const res = (await onRequestGet(makeCtx(envWithoutKv()))) as Response;
    expect(res.status).toBe(200);
    const body = (await res.json()) as { total: number };
    expect(body.total).toBe(0);
  });
});
