import { describe, expect, it } from 'vitest';

describe('@kyralabs/m3e-shapes entry', () => {
  it('imports', async () => {
    await expect(import('./index.js')).resolves.toBeTypeOf('object');
  });
});
