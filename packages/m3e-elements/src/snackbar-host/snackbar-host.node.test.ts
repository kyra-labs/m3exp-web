// Runs in the `node` Vitest project: no DOM globals exist (COMPONENT_SPEC §0 CAC).
import { describe, expect, it } from 'vitest';

describe('the snackbar entries in a non-DOM environment', () => {
  it('import without throwing and register nothing', async () => {
    expect(typeof globalThis.document).toBe('undefined');
    await expect(import('./index.js')).resolves.toHaveProperty('M3eSnackbarHost');
    const layout = await import('../snackbar-layout/index.js');
    expect(layout).toHaveProperty('SnackbarHostController');
    // The queue itself needs no DOM.
    const state = new layout.SnackbarHostState();
    const shown = state.showSnackbar('Saved');
    expect(state.currentSnackbarData?.visuals).toEqual({
      message: 'Saved',
      actionLabel: null,
      withDismissAction: false,
      duration: 'short',
    });
    state.currentSnackbarData?.dismiss();
    await expect(shown).resolves.toBe('dismissed');
  });
});
