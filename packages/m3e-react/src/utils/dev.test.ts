import { afterEach, describe, expect, it, vi } from 'vitest';
import { isDev } from './dev.js';

// Consumer bundles without `process` are covered in tools/check-node-env.test.js.
describe('isDev', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('follows NODE_ENV when process exists', () => {
    expect(isDev()).toBe(true);
    vi.stubEnv('NODE_ENV', 'production');
    expect(isDev()).toBe(false);
  });
});
