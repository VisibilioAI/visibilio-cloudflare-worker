import { describe, it, expect, beforeEach } from 'vitest';
import { putArticle, deleteArticle } from '../../functions/_lib/storage';
import type { WorkerEnv } from '../../functions/_lib/auth';

class MockKv {
  private store = new Map<string, string>();
  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }
  async put(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }
  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}

let kv: MockKv;
let env: WorkerEnv;

beforeEach(() => {
  kv = new MockKv();
  env = { API_KEY: 'x', ARTICLES: kv as unknown as KVNamespace };
});

describe('storage', () => {
  it('putArticle writes payload and updates the index', async () => {
    await putArticle(
      env,
      'my-slug',
      { title: 't' },
      { slug: 'my-slug', title: 't', published_at: '2026-01-01T00:00:00Z' },
    );
    expect(await kv.get('my-slug')).toContain('"title"');
    const index = JSON.parse((await kv.get('__index')) ?? '[]');
    expect(index).toHaveLength(1);
    expect(index[0].slug).toBe('my-slug');
  });

  it('putArticle replaces existing index entry for the same slug', async () => {
    await putArticle(
      env,
      'my-slug',
      { title: 'v1' },
      { slug: 'my-slug', title: 'v1', published_at: '2026-01-01T00:00:00Z' },
    );
    await putArticle(
      env,
      'my-slug',
      { title: 'v2' },
      { slug: 'my-slug', title: 'v2', published_at: '2026-01-02T00:00:00Z' },
    );
    const index = JSON.parse((await kv.get('__index')) ?? '[]');
    expect(index).toHaveLength(1);
    expect(index[0].title).toBe('v2');
  });

  it('deleteArticle returns true on existing slug and removes index entry', async () => {
    await putArticle(
      env,
      'my-slug',
      { title: 't' },
      { slug: 'my-slug', title: 't', published_at: '2026-01-01T00:00:00Z' },
    );
    const removed = await deleteArticle(env, 'my-slug');
    expect(removed).toBe(true);
    expect(await kv.get('my-slug')).toBeNull();
    expect(JSON.parse((await kv.get('__index')) ?? '[]')).toHaveLength(0);
  });

  it('deleteArticle returns false when slug does not exist', async () => {
    expect(await deleteArticle(env, 'never-was')).toBe(false);
  });

  it('throws a helpful error when ARTICLES binding is missing', async () => {
    const envNoKv: WorkerEnv = { API_KEY: 'x' };
    await expect(
      putArticle(
        envNoKv,
        'slug',
        {},
        { slug: 'slug', title: 't', published_at: '2026-01-01T00:00:00Z' },
      ),
    ).rejects.toThrow(/ARTICLES KV namespace is not bound/);
  });
});
