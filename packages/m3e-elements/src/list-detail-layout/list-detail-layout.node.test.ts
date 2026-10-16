// Runs in the `node` Vitest project: no DOM globals exist (COMPONENT_SPEC §0 CAC).
import { describe, expect, it } from 'vitest';

describe('the canonical layout entries in a non-DOM environment', () => {
  it('import without registering anything', async () => {
    expect(typeof globalThis.window).toBe('undefined');
    const listDetail = await import('./index.js');
    expect(typeof listDetail.M3eListDetailLayout).toBe('function');
    const supporting = await import('../supporting-pane-layout/index.js');
    expect(typeof supporting.M3eSupportingPaneLayout).toBe('function');
    const layout = await import('../pane-scaffold-layout/index.js');
    expect(typeof layout.PaneScaffoldLayout).toBe('function');
    // The navigator runs without a DOM (compact directive from a 0 × 0 "viewport").
    const navigator = layout.createPaneScaffoldNavigator('list-detail');
    navigator.navigateTo('primary', 1);
    expect(navigator.scaffoldValue.primary).toBe('expanded');
    expect(typeof (await import('../pane-motion/index.js')).paneTransitions).toBe('function');
    expect(typeof (await import('../pane-expansion/index.js')).attachPaneExpansion).toBe(
      'function',
    );
  });
});
