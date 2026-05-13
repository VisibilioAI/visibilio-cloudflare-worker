/**
 * vitest globalSetup — spin up `wrangler pages dev` once for the whole
 * integration suite, then tear it down at the end.
 *
 * The worker boots on a fixed port (8788). Tests target
 * `http://127.0.0.1:8788` directly. KV is emulated by miniflare in-memory;
 * a per-suite namespace is created via the `--kv ARTICLES` flag, so tests
 * don't need to provision real Cloudflare resources.
 *
 * API_KEY is injected via a temp .dev.vars file (gitignored, written
 * fresh each run). TEMPLATE_VERSION is set via wrangler.toml [vars].
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const PORT = 8788;
const TEST_API_KEY = 'integration-test-api-key';
const DEV_VARS_PATH = resolve(process.cwd(), '.dev.vars');

let proc: ChildProcess | null = null;

export async function setup(): Promise<void> {
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
