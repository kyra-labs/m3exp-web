// Runs in the `node` Vitest project: no DOM globals exist.
import { describe, expect, it } from 'vitest';

describe('M3eElement in a non-DOM environment', () => {
  it('imports without throwing and define() is a no-op', async () => {
    expect(typeof globalThis.HTMLElement).toBe('undefined');
    const { M3eElement } = await import('./M3eElement.js');
    class Example extends M3eElement {}
    expect(() => {
      Example.define('m3e-example');
    }).not.toThrow();
  });

  it('the package entry imports without throwing', async () => {
    await expect(import('../index.js')).resolves.toHaveProperty('M3eElement');
  });
});
