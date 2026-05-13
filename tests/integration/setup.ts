/**
 * vitest globalSetup — boots `wrangler pages dev` once for the whole
 * integration suite, then tears it down at the end.
 *
 * Two modes:
 *
 *  1. Default (local): spawn `wrangler pages dev` on port 8788, write a
 *     temp `.dev.vars`, set WORKER_BASE_URL + WORKER_API_KEY in env.
 *     KV is emulated by miniflare in-memory.
 *
 *  2. External (Tier 3 CI): when `WORKER_BASE_URL` is already set in the
 *     environment (e.g. CI pointing at a real Cloudflare preview deploy),
 *     skip the spawn entirely. The same test suite runs against the real
 *     workerd runtime running on Cloudflare's edge. Caller supplies
 *     WORKER_API_KEY too.
 *
 * The two modes share zero infra surface beyond reading env vars — keeping
 * the smoke job as just `npm run test:integration` with the env pre-set.
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const PORT = 8788;
const TEST_API_KEY = 'integration-test-api-key';
const DEV_VARS_PATH = resolve(process.cwd(), '.dev.vars');

let proc: ChildProcess | null = null;
let externalMode = false;

export async function setup(): Promise<void> {
  // External mode — CI pointed us at a real preview deployment.
  if (process.env.WORKER_BASE_URL && process.env.WORKER_API_KEY) {
    externalMode = true;
    // Health-check before letting tests run, so flaky deploys fail fast
    // with a clear message rather than dozens of identical fetch errors.
    await waitForReady(`${process.env.WORKER_BASE_URL}/api/content/version`, 60000);
    return;
  }

  writeFileSync(DEV_VARS_PATH, `API_KEY=${TEST_API_KEY}\n`, 'utf8');

  proc = spawn(
    'npx',
    [
      'wrangler',
      'pages',
      'dev',
      '.',
      '--port',
      String(PORT),
      '--ip',
      '127.0.0.1',
      '--kv',
      'ARTICLES',
      '--log-level',
      'warn',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );

  proc.stdout?.on('data', (chunk: Buffer) => {
    const s = chunk.toString();
    if (process.env.VERBOSE_WRANGLER) process.stdout.write(`[wrangler] ${s}`);
  });
  proc.stderr?.on('data', (chunk: Buffer) => {
    const s = chunk.toString();
    if (process.env.VERBOSE_WRANGLER) process.stderr.write(`[wrangler] ${s}`);
  });

  await waitForReady(`http://127.0.0.1:${PORT}/api/content/version`, 30000);

  process.env.WORKER_BASE_URL = `http://127.0.0.1:${PORT}`;
  process.env.WORKER_API_KEY = TEST_API_KEY;
}

export async function teardown(): Promise<void> {
  if (externalMode) return; // nothing to clean up; preview deploy lives on
  if (proc && !proc.killed) {
    proc.kill('SIGTERM');
    await new Promise((r) => setTimeout(r, 500));
    if (!proc.killed) proc.kill('SIGKILL');
  }
  if (existsSync(DEV_VARS_PATH)) unlinkSync(DEV_VARS_PATH);
}

async function waitForReady(url: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown = null;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(url);
      if (r.status === 200) return;
      lastError = `status ${r.status}`;
    } catch (err) {
      lastError = err;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(
    `wrangler pages dev did not become ready within ${timeoutMs}ms (${url}). Last: ${String(
      lastError,
    )}`,
  );
}
