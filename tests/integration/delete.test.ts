import { describe, it, expect } from 'vitest';
import { validArticle } from '../fixtures/valid-article';

const BASE = () => process.env.WORKER_BASE_URL ?? 'http://127.0.0.1:8788';
const KEY = () => process.env.WORKER_API_KEY ?? '';

describe('DELETE /api/content/:slug', () => {
  it('returns 204 for an existing slug and 404 on repeat call', async () => {
    const slug = `del-existing-${Date.now()}`;

    const create = await fetch(`${BASE()}/api/content/`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${KEY()}` },
      body: JSON.stringify({ ...validArticle, slug }),
    });
    expect(create.status).toBe(201);

    const first = await fetch(`${BASE()}/api/content/${slug}`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${KEY()}` },
    });
    expect(first.status).toBe(204);

    const second = await fetch(`${BASE()}/api/content/${slug}`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${KEY()}` },
    });
    expect(second.status).toBe(404);
  });

  it('returns 404 for a slug that never existed', async () => {
    const res = await fetch(`${BASE()}/api/content/never-was-${Date.now()}`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${KEY()}` },
    });
    expect(res.status).toBe(404);
  });

  it('returns 401 without auth', async () => {
    const res = await fetch(`${BASE()}/api/content/some-slug`, { method: 'DELETE' });
    expect(res.status).toBe(401);
  });
});
