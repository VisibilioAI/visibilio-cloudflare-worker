/**
 * Bearer-token auth for the publishing endpoints.
 *
 * The expected token is the customer's API_KEY env var, set via:
 *   wrangler pages secret put API_KEY --project-name <name>
 *
 * The Visibilio gateway sends this same token in the `Authorization` header
 * on every publish call. Compare with constant-time equality to avoid timing
 * leaks on customer deployments with predictable keys.
 */

export interface WorkerEnv {
  readonly API_KEY: string;
  readonly TEMPLATE_VERSION?: string;
  readonly ARTICLES?: KVNamespace;
}

export function requireBearer(request: Request, env: WorkerEnv): null | Response {
  const header = request.headers.get('authorization') ?? '';
  const expected = env.API_KEY ?? '';

  if (!expected) {
    return jsonResponse(
      { error: 'Worker misconfigured: API_KEY is not set' },
      { status: 500 },
    );
  }

  const provided = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!provided || !timingSafeEqual(provided, expected)) {
    return jsonResponse(
      { error: 'Unauthorized', detail: 'Missing or invalid Bearer token' },
      { status: 401 },
    );
  }
  return null;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...(init.headers ?? {}),
    },
  });
}
