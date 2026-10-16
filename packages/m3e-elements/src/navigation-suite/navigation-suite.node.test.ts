// Runs in the `node` Vitest project: no DOM globals exist (COMPONENT_SPEC §0 CAC).
import { describe, expect, it } from 'vitest';

describe('the navigation-suite entries in a non-DOM environment', () => {
  it('import without registering anything', async () => {
    expect(typeof globalThis.window).toBe('undefined');
    const entry = await import('./index.js');
    expect(typeof entry.M3eNavigationSuite).toBe('function');
    const layout = await import('../navigation-suite-layout/index.js');
    expect(typeof layout.NavigationSuiteLayout).toBe('function');
  });
});
