// Runs in the `node` Vitest project: no DOM globals exist.
import { describe, expect, it } from 'vitest';

describe('progress indicators in a non-DOM environment', () => {
  it('import without throwing (registration is guarded)', async () => {
    expect(typeof globalThis.HTMLElement).toBe('undefined');
    await expect(import('../linear-progress/index.js')).resolves.toHaveProperty(
      'M3eLinearProgress',
    );
    await expect(import('../circular-progress/index.js')).resolves.toHaveProperty(
      'M3eCircularProgress',
    );
    await expect(import('./index.js')).resolves.toHaveProperty('LinearProgressDriver');
  });
});
