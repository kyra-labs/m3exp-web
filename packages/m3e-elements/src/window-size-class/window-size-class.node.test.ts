// Runs in the `node` Vitest project: no DOM globals exist (COMPONENT_SPEC §0 CAC).
import { describe, expect, it, vi } from 'vitest';

describe('the window-size-class entry in a non-DOM environment', () => {
  it('imports, classifies, and observes nothing', async () => {
    expect(typeof globalThis.window).toBe('undefined');
    const entry = await import('./index.js');
    expect(entry.windowSizeClass({ width: 840, height: 900 })).toMatchObject({
      widthClass: 'expanded',
      heightClass: 'expanded',
    });
    expect(entry.currentWindowSizeClass()).toBeNull();
    const callback = vi.fn();
    entry.observeWindowSizeClass(callback, { signal: new AbortController().signal });
    expect(callback).not.toHaveBeenCalled();
  });
});
