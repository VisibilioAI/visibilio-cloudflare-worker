/**
 * Reusable test fixture for a payload that matches
 * `schemas/cloudflare-article.v1.json` exactly. Each test typically
 * spreads this base and overrides one field to exercise a single
 * validation rule.
 */

const PNG_1PX =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgAAIAAAUAAen63NgAAAAASUVORK5CYII=';

const image = {
  data: PNG_1PX,
  format: 'png' as const,
  width: 1200,
  height: 630,
  alt: 'Article hero image',
};

export const validArticle = {
  title: 'Stop Using LinkedIn Conversation Ads',
  slug: 'stop-using-linkedin-conversation-ads',
  content: {
    body_html: '<p>Discover the LinkedIn Ad Format That May Be Tanking Your Campaign.</p>',
    excerpt:
      'If your LinkedIn targeting is already tight, Conversation Ads can be the quiet performance killer.',
    reading_time_minutes: 4,
    word_count: 850,
  },
  seo: {
    meta_title: 'Stop Using LinkedIn Conversation Ads',
    meta_description:
      'Discover the LinkedIn Ad Format That May Be Tanking Your Campaign — and what to use instead.',
    focus_keywords: ['linkedin', 'ads', 'b2b', 'paid-media', 'campaign'],
    canonical_url: 'https://www.example.com/blog/stop-using-linkedin-conversation-ads',
  },
  social: {
    og_title: 'Stop Using LinkedIn Conversation Ads',
    og_description:
      'Discover the LinkedIn Ad Format That May Be Tanking Your Campaign — and what to use instead.',
  },
  categorization: {
    primary_category: 'EAI & Integration',
    tags: ['linkedin', 'ads'],
    content_type: 'article',
  },
  author: {
    name: 'EXAMPLE.COM',
    type: 'Organization' as const,
  },
  images: {
    featured: image,
    og: image,
    thumbnail: image,
  },
  published_at: '2026-04-29T06:56:33Z',
  updated_at: '2026-04-29T06:56:33Z',
  status: 'published' as const,
};
