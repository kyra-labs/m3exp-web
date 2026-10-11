import { describe, expect, it } from 'vitest';
import * as elements from '@kyralabs/m3e-elements';
import * as react from '@kyralabs/m3e-react';
import * as tokens from '@kyralabs/m3e-tokens';

describe('@kyralabs/m3exp-web umbrella', () => {
  it('re-exports every JS layer from the root entry', async () => {
    const umbrella = await import('./index.js');
    const expected = [...Object.keys(tokens), ...Object.keys(elements), ...Object.keys(react)];
    expect(Object.keys(umbrella).sort()).toEqual(expected.sort());
    expect(umbrella.M3eElement).toBe(elements.M3eElement);
  });

  it('exposes one subpath entry per layer', async () => {
    expect(Object.keys(await import('./tokens.js'))).toEqual(Object.keys(tokens));
    expect(Object.keys(await import('./elements.js'))).toEqual(Object.keys(elements));
    expect(Object.keys(await import('./react.js'))).toEqual(Object.keys(react));
  });
});
