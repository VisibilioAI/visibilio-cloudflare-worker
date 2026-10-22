import { describe, it, expect } from 'vitest';

const BASE = () => process.env.WORKER_BASE_URL ?? 'http://127.0.0.1:8788';
const KEY = () => process.env.WORKER_API_KEY ?? '';

describe('GET /api/content/schema', () => {
  it('returns the vendored JSON Schema (public, no auth required)', async () => {
    const res = await fetch(`${BASE()}/api/content/schema`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/json');
    const body = (await res.json()) as { $id: string; type: string };
    expect(body.$id).toBe('https://visibilio.ai/schemas/cloudflare-article.v1.json');
    expect(body.type).toBe('object');
  });
});

describe('GET /api/content/version', () => {
  it('returns template_version, schema_id, and capabilities (public)', async () => {
    const res = await fetch(`${BASE()}/api/content/version`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      template_version: string;
      schema_id: string;
      capabilities: string[];
    };
    expect(body.template_version).toBeTruthy();
    expect(body.schema_id).toBe('https://visibilio.ai/schemas/cloudflare-article.v1.json');
    expect(body.capabilities).toContain('dry_run');
    expect(body.capabilities).toContain('tags_discovery');
  });
});

describe('GET /api/content/tags', () => {
  it('returns { tags: [] } by default (no fixed taxonomy in template)', async () => {
    const res = await fetch(`${BASE()}/api/content/tags`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { tags: string[] };
    expect(Array.isArray(body.tags)).toBe(true);
  });

  it('is public (no auth required)', async () => {
    const res = await fetch(`${BASE()}/api/content/tags`);
    expect(res.status).not.toBe(401);
  });
});

describe('GET /api/content/catalog', () => {
  it('requires a Bearer token (401 without one)', async () => {
    const res = await fetch(`${BASE()}/api/content/catalog`);
    expect(res.status).toBe(401);
  });

  it('returns a catalog shape for an authenticated request', async () => {
    const res = await fetch(`${BASE()}/api/content/catalog`, {
      headers: { authorization: `Bearer ${KEY()}` },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      categories: string[];
      articles: unknown[];
      total: number;
    };
    expect(Array.isArray(body.categories)).toBe(true);
    expect(Array.isArray(body.articles)).toBe(true);
    expect(typeof body.total).toBe('number');
  });
});
