import { describe, it, expect } from 'vitest';
import { validateArticle, getSchema } from '../../functions/_lib/validator';
import { validArticle } from '../fixtures/valid-article';

describe('validateArticle — happy path', () => {
  it('accepts the canonical valid fixture', () => {
    const result = validateArticle(validArticle);
    expect(result.ok).toBe(true);
  });

  it('exposes the loaded JSON Schema with stable $id', () => {
    const schema = getSchema() as { $id: string };
    expect(schema.$id).toBe('https://visibilio.ai/schemas/cloudflare-article.v1.json');
  });
});

describe('validateArticle — rejection paths', () => {
  it('rejects focus_keywords with more than 5 items', () => {
    const result = validateArticle({
      ...validArticle,
      seo: { ...validArticle.seo, focus_keywords: ['a', 'b', 'c', 'd', 'e', 'f'] },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((i) => i.path.includes('focus_keywords'))).toBe(true);
    }
  });

  it('rejects missing top-level content block', () => {
    const without = { ...validArticle } as Partial<typeof validArticle>;
    delete without.content;
    const result = validateArticle(without);
    expect(result.ok).toBe(false);
  });

  it('rejects empty categorization.tags', () => {
    const result = validateArticle({
      ...validArticle,
      categorization: { ...validArticle.categorization, tags: [] },
    });
    expect(result.ok).toBe(false);
  });

  it('rejects slug with uppercase letters', () => {
    const result = validateArticle({ ...validArticle, slug: 'Bad-Slug' });
    expect(result.ok).toBe(false);
  });

  it('rejects author.type outside Person|Organization', () => {
    const result = validateArticle({
      ...validArticle,
      author: { name: 'X', type: 'Robot' },
    });
    expect(result.ok).toBe(false);
  });

  it('rejects non-URL canonical_url', () => {
    const result = validateArticle({
      ...validArticle,
      seo: { ...validArticle.seo, canonical_url: 'not-a-url' },
    });
    expect(result.ok).toBe(false);
  });

  it('collects multiple issues, not just the first', () => {
    const result = validateArticle({
      ...validArticle,
      slug: 'BAD',
      seo: { ...validArticle.seo, canonical_url: 'nope' },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.length).toBeGreaterThanOrEqual(2);
    }
  });
});
