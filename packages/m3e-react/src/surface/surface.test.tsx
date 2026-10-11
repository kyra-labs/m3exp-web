import { afterEach, describe, expect, it } from 'vitest';
import { renderReact } from '../test/parity.js';
import { Surface } from './Surface.js';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('<Surface>', () => {
  it('maps props to the m3e-css surface classes', async () => {
    const el = (
      await renderReact(
        <Surface container="high" elevation={1} shape="medium" className="x">
          hi
        </Surface>,
      )
    ).firstElementChild!;
    expect(el.className).toBe(
      'm3e-surface m3e-surface--container-high m3e-surface--elevation-1 m3e-surface--shape-medium x',
    );
    expect(el.textContent).toBe('hi');
  });

  it('uses the plain container class for "default" and supports variant', async () => {
    const el = (await renderReact(<Surface container="default" variant />)).firstElementChild!;
    expect(el.className).toBe('m3e-surface m3e-surface--container m3e-surface--variant');
  });
});
