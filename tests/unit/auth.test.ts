import { describe, it, expect } from 'vitest';
import { requireBearer, type WorkerEnv } from '../../functions/_lib/auth';

const env: WorkerEnv = { API_KEY: 'secret-token' };

describe('requireBearer', () => {
  it('returns null when token matches', () => {
    const req = new Request('https://example.com/api/content/', {
      headers: { authorization: 'Bearer secret-token' },
    });
    expect(requireBearer(req, env)).toBeNull();
  });

  it('returns 401 when header is missing', () => {
    const req = new Request('https://example.com/api/content/');
    const result = requireBearer(req, env);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
  });

  it('returns 401 when header uses wrong scheme', () => {
    const req = new Request('https://example.com/api/content/', {
      headers: { authorization: 'Basic secret-token' },
    });
    const result = requireBearer(req, env);
    expect(result!.status).toBe(401);
  });

  it('returns 401 when token differs', () => {
    const req = new Request('https://example.com/api/content/', {
      headers: { authorization: 'Bearer not-the-key' },
    });
    expect(requireBearer(req, env)!.status).toBe(401);
  });

  it('returns 500 when API_KEY is not configured on the worker', () => {
    const req = new Request('https://example.com/api/content/', {
      headers: { authorization: 'Bearer secret-token' },
    });
    const result = requireBearer(req, { API_KEY: '' });
    expect(result!.status).toBe(500);
  });

  it('rejects shorter prefix of the correct token (constant-time guard)', () => {
    const req = new Request('https://example.com/api/content/', {
      headers: { authorization: 'Bearer secret' },
    });
    expect(requireBearer(req, env)!.status).toBe(401);
  });
});
