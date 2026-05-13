import { describe, it, expect } from 'vitest';
import { validArticle } from '../fixtures/valid-article';

const BASE = () => process.env.WORKER_BASE_URL ?? 'http://127.0.0.1:8788';
const KEY = () => process.env.WORKER_API_KEY ?? '';

function authHeaders() {
  return {
    'content-type': 'application/json',
    authorization: `Bearer ${KEY()}`,
  };
}

describe('POST /api/content/ — publish flow (workerd)', () => {
  it('publishes a valid article and returns 201 with slug + live URL', async () => {
    const slug = `pub-happy-${Date.now()}`;
    const res = await fetch(`${BASE()}/api/content/`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ ...validArticle, slug }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { ok: boolean; slug: string; url: string };
    expect(body.ok).toBe(true);
    expect(body.slug).toBe(slug);
    expect(body.url).toContain(`/content-hub/${slug}`);
  });

  it('persists the article to KV (subsequent DELETE returns 204)', async () => {
    const slug = `pub-persists-${Date.now()}`;
    const create = await fetch(`${BASE()}/api/content/`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ ...validArticle, slug }),
    });
    expect(create.status).toBe(201);

    const del = await fetch(`${BASE()}/api/content/${slug}`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${KEY()}` },
    });
    expect(del.status).toBe(204);
  });

  it('rejects invalid payload with 400 and structured issues', async () => {
    const bad = { ...validArticle, slug: 'BAD SLUG', seo: { ...validArticle.seo, canonical_url: 'not-a-url' } };
    const res = await fetch(`${BASE()}/api/content/`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(bad),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { ok: boolean; error: string; issues: { path: string }[] };
    expect(body.ok).toBe(false);
    expect(body.error).toContain('Schema validation failed');
    expect(body.issues.length).toBeGreaterThan(0);
  });

  it('rejects non-JSON request body with 400', async () => {
    const res = await fetch(`${BASE()}/api/content/`, {
      method: 'POST',
      headers: authHeaders(),
      body: 'not json',
    });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/content/?dry_run=true — validate only', () => {
  it('returns 200 ok=true without persisting', async () => {
    const slug = `dryrun-ok-${Date.now()}`;
    const res = await fetch(`${BASE()}/api/content/?dry_run=true`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ ...validArticle, slug }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; dry_run: boolean };
    expect(body.ok).toBe(true);
    expect(body.dry_run).toBe(true);

    // DELETE should return 404 because dry_run did not persist.
    const del = await fetch(`${BASE()}/api/content/${slug}`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${KEY()}` },
    });
    expect(del.status).toBe(404);
  });

  it('returns 400 with issues when payload is invalid (does not persist either)', async () => {
    const res = await fetch(`${BASE()}/api/content/?dry_run=true`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ ...validArticle, slug: 'BAD' }),
    });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/content/ — auth', () => {
  it('returns 401 without Authorization header', async () => {
    const res = await fetch(`${BASE()}/api/content/`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(validArticle),
    });
    expect(res.status).toBe(401);
  });

  it('returns 401 with wrong Bearer token', async () => {
    const res = await fetch(`${BASE()}/api/content/`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer wrong-key' },
      body: JSON.stringify(validArticle),
    });
    expect(res.status).toBe(401);
  });
});
