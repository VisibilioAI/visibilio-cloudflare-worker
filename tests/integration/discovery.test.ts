import { describe, it, expect } from 'vitest';

const BASE = () => process.env.WORKER_BASE_URL ?? 'http://127.0.0.1:8788';

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
  it('returns template_version and schema_id (public)', async () => {
    const res = await fetch(`${BASE()}/api/content/version`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { template_version: string; schema_id: string };
    expect(body.template_version).toBeTruthy();
    expect(body.schema_id).toBe('https://visibilio.ai/schemas/cloudflare-article.v1.json');
  });
});
