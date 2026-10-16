// Runs in the `node` Vitest project: no DOM globals exist.
import { describe, expect, it } from 'vitest';

describe('<m3e-floating-toolbar> in a non-DOM environment', () => {
  it('imports without throwing (registration is guarded)', async () => {
    expect(typeof globalThis.HTMLElement).toBe('undefined');
    await expect(import('./index.js')).resolves.toHaveProperty('M3eFloatingToolbar');
    await expect(import('../floating-toolbar-layout/index.js')).resolves.toHaveProperty(
      'FloatingToolbarLayout',
    );
    await expect(import('../roving-focus/index.js')).resolves.toHaveProperty('RovingFocus');
  });
});
