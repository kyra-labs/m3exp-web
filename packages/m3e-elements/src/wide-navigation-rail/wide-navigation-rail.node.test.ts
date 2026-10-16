// Runs in the `node` Vitest project: no DOM globals exist (COMPONENT_SPEC §0 CAC).
import { describe, expect, it } from 'vitest';

describe('the navigation entries in a non-DOM environment', () => {
  it('import without throwing and register nothing', async () => {
    expect(typeof globalThis.document).toBe('undefined');
    await expect(import('../navigation-item/index.js')).resolves.toHaveProperty(
      'M3eNavigationItem',
    );
    await expect(import('../short-navigation-bar/index.js')).resolves.toHaveProperty(
      'M3eShortNavigationBar',
    );
    await expect(import('./index.js')).resolves.toHaveProperty('M3eWideNavigationRail');
    await expect(import('../modal-wide-navigation-rail/index.js')).resolves.toHaveProperty(
      'M3eModalWideNavigationRail',
    );
    await expect(import('../wide-navigation-rail-layout/index.js')).resolves.toHaveProperty(
      'WideNavigationRailLayout',
    );
  });
});
