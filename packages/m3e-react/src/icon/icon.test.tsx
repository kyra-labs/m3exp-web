import '@kyralabs/m3e-elements/icon.js';
import { afterEach, describe, expect, it } from 'vitest';
import { elementContract, reactContract, renderElement, renderReact } from '../test/parity.js';
import { Icon } from './Icon.js';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('<Icon>', () => {
  it('is decorative by default', async () => {
    const container = await renderReact(<Icon name="home" />);
    expect(container.innerHTML).toBe('<span class="m3e-icon" aria-hidden="true">home</span>');
  });

  it('labels with role="img"', async () => {
    const span = (await renderReact(<Icon name="search" label="Search" />)).firstElementChild!;
    expect(span.getAttribute('role')).toBe('img');
    expect(span.getAttribute('aria-label')).toBe('Search');
    expect(span.hasAttribute('aria-hidden')).toBe(false);
  });

  it('keeps user classes and styles', async () => {
    const span = (
      await renderReact(
        <Icon name="star" className="extra" style={{ color: 'red' }} weight={500} />,
      )
    ).firstElementChild as HTMLElement;
    expect(span.className).toBe('m3e-icon extra');
    expect(span.style.getPropertyValue('--m3e-comp-icon-weight')).toBe('500');
    expect(span.style.color).toBe('red');
  });
});

describe('<Icon> ⇔ <m3e-icon> DOM parity', () => {
  it.each([
    ['plain', <Icon name="home" />, '<m3e-icon name="home"></m3e-icon>'],
    ['filled', <Icon name="favorite" fill />, '<m3e-icon name="favorite" fill></m3e-icon>'],
    [
      'all axes',
      <Icon name="settings" weight={600} grade={-25} opticalSize={40} />,
      '<m3e-icon name="settings" weight="600" grade="-25" optical-size="40"></m3e-icon>',
    ],
    [
      'labelled',
      <Icon name="search" label="Search" />,
      '<m3e-icon name="search" label="Search"></m3e-icon>',
    ],
  ])('%s', async (_, react, html) => {
    const fromReact = reactContract(await renderReact(react));
    const fromElement = elementContract(await renderElement(html));
    expect(fromElement).toBe(fromReact);
  });
});
