/**
 * Integration test config — spins up `wrangler pages dev` against the real
 * functions/ tree, then runs HTTP-level tests against it. This catches what
 * the Node-based unit tests cannot:
 *   - Real workerd runtime (V8 isolate), not Node
 *   - Real Pages Functions filename → URL routing
 *   - Real KV binding via miniflare emulation
 *   - Real Wrangler bundle (JSON imports, module assertions, AJV inside workerd)
 *
 * Slower than unit tests (~5s boot per run), so kept in a separate config
 * and run via `npm run test:integration`.
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.ts'],
    globalSetup: ['./tests/integration/setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
  },
});
