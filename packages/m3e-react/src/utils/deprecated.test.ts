import { afterEach, describe, expect, it, vi } from 'vitest';
import { warnDeprecated, warnDeprecatedProp } from './deprecated.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('warnDeprecatedProp (D16)', () => {
  it('warns once per usage in development, in the [m3exp-web] format', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    warnDeprecatedProp('Example old', 'Example new');
    warnDeprecatedProp('Example old', 'Example new');
    warnDeprecatedProp('Example other', 'Example new', '1.9');
    expect(warn.mock.calls.map((c) => String(c[0]))).toEqual([
      '[m3exp-web] <Example old> is deprecated since 1.8 and will be removed in 2.0. Use <Example new>.',
      '[m3exp-web] <Example other> is deprecated since 1.9 and will be removed in 2.0. Use <Example new>.',
    ]);
  });

  it('is silent in production', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubEnv('NODE_ENV', 'production');
    try {
      warnDeprecatedProp('Prod old', 'Prod new');
      warnDeprecated('ProdComponent', 'Other');
    } finally {
      vi.unstubAllEnvs();
    }
    expect(warn).not.toHaveBeenCalled();
  });
});
