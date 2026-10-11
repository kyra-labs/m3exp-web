import { afterEach, describe, expect, it } from 'vitest';
import './index.js';

const flush = () =>
  new Promise<void>((resolve) => {
    queueMicrotask(resolve);
  });

const mount = async (html: string) => {
  document.body.innerHTML = html;
  await flush();
  return document.body.firstElementChild as HTMLElement;
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('<m3e-icon>', () => {
  it('renders a decorative .m3e-icon ligature', async () => {
    const host = await mount('<m3e-icon name="home"></m3e-icon>');
    expect(host.innerHTML).toBe('<span class="m3e-icon" aria-hidden="true">home</span>');
  });

  it('maps fill and axes to data-fill and --m3e-comp-icon-* properties', async () => {
    const host = await mount(
      '<m3e-icon name="star" fill weight="600" grade="-25" optical-size="40"></m3e-icon>',
    );
    const span = host.querySelector('span')!;
    expect(span.hasAttribute('data-fill')).toBe(true);
    expect(span.style.getPropertyValue('--m3e-comp-icon-weight')).toBe('600');
    expect(span.style.getPropertyValue('--m3e-comp-icon-grade')).toBe('-25');
    expect(span.style.getPropertyValue('--m3e-comp-icon-optical-size')).toBe('40');
  });

  it('becomes role="img" with a label', async () => {
    const host = await mount('<m3e-icon name="search" label="Search"></m3e-icon>');
    const span = host.querySelector('span')!;
    expect(span.getAttribute('role')).toBe('img');
    expect(span.getAttribute('aria-label')).toBe('Search');
    expect(span.hasAttribute('aria-hidden')).toBe(false);
  });

  it('uses its text content when no name is given, and updates in place', async () => {
    const host = (await mount('<m3e-icon>menu</m3e-icon>')) as HTMLElement & { name: string };
    const span = host.querySelector('span')!;
    expect(span.textContent).toBe('menu');
    host.name = 'close';
    host.setAttribute('weight', '300');
    await flush();
    expect(host.querySelector('span')).toBe(span);
    expect(span.textContent).toBe('close');
    expect(span.style.getPropertyValue('--m3e-comp-icon-weight')).toBe('300');
    host.removeAttribute('weight');
    await flush();
    expect(span.hasAttribute('style')).toBe(false);
  });
});
