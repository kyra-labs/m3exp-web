// Runs in the `node` Vitest project: no DOM globals exist.
import { describe, expect, it } from 'vitest';

describe("the 'ripple' entry in a non-DOM environment", () => {
  it('imports without throwing and attaches nothing', async () => {
    expect(typeof globalThis.document).toBe('undefined');
    await expect(import('./index.js')).resolves.toHaveProperty('attachAutoRipple');
  });
});
