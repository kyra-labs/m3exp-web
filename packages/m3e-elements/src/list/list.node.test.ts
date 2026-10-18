// Runs in the `node` Vitest project: no DOM globals exist (COMPONENT_SPEC §0 CAC).
import { describe, expect, it } from 'vitest';

describe('the list entries in a non-DOM environment', () => {
  it('import without throwing and register nothing', async () => {
    expect(typeof globalThis.document).toBe('undefined');
    await expect(import('./index.js')).resolves.toHaveProperty('M3eList');
    await expect(import('../list-layout/index.js')).resolves.toHaveProperty('ListLayout');
  });
});
