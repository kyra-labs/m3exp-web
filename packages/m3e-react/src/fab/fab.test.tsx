import { act, useRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Icon } from '../icon/Icon.js';
import { renderReact } from '../test/parity.js';
import { ExtendedFab } from './ExtendedFab.js';
import { Fab } from './Fab.js';
import { useExtendedFabScroll } from './useExtendedFabScroll.js';

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

const press = async (el: Element) => {
  await act(async () => {
    const init = { bubbles: true, button: 0, pointerId: 1, pointerType: 'mouse' };
    el.dispatchEvent(new PointerEvent('pointerdown', init));
    el.dispatchEvent(new PointerEvent('pointerup', init));
    (el as HTMLElement).click();
    await Promise.resolve();
  });
};

describe('<Fab>', () => {
  it('renders the m3e-css contract (defaults baseline / primary container)', async () => {
    const button = (
      await renderReact(<Fab aria-label="Create" icon={<Icon name="add" />} />)
    ).querySelector('button')!;
    expect(button.className).toBe('m3e-fab m3e-fab--size-baseline m3e-fab--primary-container');
    expect(button.getAttribute('type')).toBe('button');
    expect(button.getAttribute('aria-label')).toBe('Create');
    expect(button.hasAttribute('data-ripple')).toBe(true);
    expect(button.querySelector('.m3e-icon')!.getAttribute('aria-hidden')).toBe('true');
  });

  it('maps size and color', async () => {
    const button = (
      await renderReact(
        <Fab aria-label="Create" size="large" color="tertiary" icon={<Icon name="add" />} />,
      )
    ).querySelector('button')!;
    expect(button.className).toBe('m3e-fab m3e-fab--size-large m3e-fab--tertiary');
  });

  it('calls onPress and sets data-pressed while pressed', async () => {
    const onPress = vi.fn();
    const button = (
      await renderReact(<Fab aria-label="Create" icon={<Icon name="add" />} onPress={onPress} />)
    ).querySelector('button')!;
    await press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(button.hasAttribute('data-pressed')).toBe(false);
  });

  it('size="small" warns once in development (D4); other sizes do not', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await renderReact(
      <>
        <Fab aria-label="A" icon={<Icon name="add" />} />
        <Fab aria-label="B" size="medium" icon={<Icon name="add" />} />
      </>,
    );
    expect(warn).not.toHaveBeenCalled();
    await renderReact(
      <>
        <Fab aria-label="C" size="small" icon={<Icon name="add" />} />
        <Fab aria-label="D" size="small" icon={<Icon name="add" />} />
      </>,
    );
    const messages = warn.mock.calls.map((c) => String(c[0]));
    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain('<Fab size="small"> is deprecated');
    expect(messages[0]).toContain('Use <Fab size="baseline">');
    expect(document.querySelector('.m3e-fab--size-small')).not.toBeNull();
  });

  it('warns once when an icon-only FAB has no accessible name', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await renderReact(<Fab icon={<Icon name="add" />} />);
    await renderReact(<Fab icon={<Icon name="add" />} />);
    const messages = warn.mock.calls.map((c) => String(c[0]));
    expect(messages.filter((m) => m.includes('<Fab> needs an aria-label'))).toHaveLength(1);
  });
});

describe('<ExtendedFab>', () => {
  it('renders the m3e-css contract; the label is the name', async () => {
    const button = (
      await renderReact(<ExtendedFab icon={<Icon name="add" />} label="Create" />)
    ).querySelector('button')!;
    expect(button.className).toBe(
      'm3e-extended-fab m3e-extended-fab--size-small m3e-extended-fab--primary-container',
    );
    expect(button.hasAttribute('aria-label')).toBe(false);
    expect(button.querySelector('.m3e-extended-fab__label')!.textContent).toBe('Create');
    expect(button.textContent).toBe('addCreate');
    expect(button.hasAttribute('data-spring')).toBe(true);
  });

  it('expanded={false} collapses (class) and keeps the label in the DOM', async () => {
    const root = await renderReact(
      <ExtendedFab icon={<Icon name="add" />} label="Create" size="medium" expanded={false} />,
    );
    const button = root.querySelector('button')!;
    expect(button.classList.contains('m3e-extended-fab--collapsed')).toBe(true);
    expect(button.classList.contains('m3e-extended-fab--size-medium')).toBe(true);
    expect(button.querySelector('.m3e-extended-fab__label')!.textContent).toBe('Create');
    // First render: no spring, m3e-css shows the collapsed state.
    expect(button.style.getPropertyValue('inline-size')).toBe('');
  });

  it('does not collapse without an icon', async () => {
    const button = (
      await renderReact(<ExtendedFab label="Save draft" expanded={false} />)
    ).querySelector('button')!;
    expect(button.classList.contains('m3e-extended-fab--collapsed')).toBe(false);
  });

  it('toggling expanded springs the width and settles back to the CSS layout', async () => {
    function Toggle({ expanded }: { expanded: boolean }) {
      return <ExtendedFab icon={<Icon name="add" />} label="Create" expanded={expanded} />;
    }
    const container = document.createElement('div');
    document.body.append(container);
    const { createRoot } = await import('react-dom/client');
    const root = createRoot(container);
    await act(async () => {
      root.render(<Toggle expanded />);
      await Promise.resolve();
    });
    const button = container.querySelector('button')!;
    button.style.setProperty('--m3e-sys-motion-spring-fast-spatial-damping-ratio', '0.9');
    button.style.setProperty('--m3e-sys-motion-spring-fast-spatial-stiffness', '1400');
    button.style.setProperty('--m3e-sys-motion-spring-fast-spatial-duration', '350ms');
    button.style.setProperty('--m3e-sys-motion-spring-fast-effects-damping-ratio', '1');
    button.style.setProperty('--m3e-sys-motion-spring-fast-effects-stiffness', '3800');
    button.style.setProperty('--m3e-sys-motion-spring-fast-effects-duration', '150ms');
    await act(async () => {
      root.render(<Toggle expanded={false} />);
      await Promise.resolve();
    });
    expect(button.classList.contains('m3e-extended-fab--collapsed')).toBe(true);
    // happy-dom has no layout, so only the write pattern is checked here (Playwright checks px).
    await vi.waitFor(() => {
      expect(button.style.getPropertyValue('grid-template-columns')).toBe('auto max-content');
    });
    await vi.waitFor(
      () => {
        expect(button.style.getPropertyValue('inline-size')).toBe('');
        expect(button.querySelector<HTMLElement>('.m3e-extended-fab__label')!.style.opacity).toBe(
          '',
        );
      },
      { timeout: 3000 },
    );
    root.unmount();
  });
});

describe('useExtendedFabScroll', () => {
  it('collapses past the threshold and, optionally, expands on scroll up', async () => {
    const seen: boolean[] = [];
    function Probe({ up }: { up: boolean }) {
      const ref = useRef<HTMLDivElement>(null);
      seen.push(useExtendedFabScroll({ target: ref, threshold: 10, expandOnScrollUp: up }));
      return <div ref={ref} data-testid="scroller" />;
    }
    for (const up of [false, true]) {
      seen.length = 0;
      const root = await renderReact(<Probe up={up} />);
      const scroller = root.querySelector<HTMLElement>('[data-testid="scroller"]')!;
      const scrollTo = async (y: number) => {
        await act(async () => {
          Object.defineProperty(scroller, 'scrollTop', { value: y, configurable: true });
          scroller.dispatchEvent(new Event('scroll'));
          await Promise.resolve();
        });
      };
      expect(seen.at(-1)).toBe(true);
      await scrollTo(5);
      expect(seen.at(-1)).toBe(true);
      await scrollTo(200);
      expect(seen.at(-1)).toBe(false);
      await scrollTo(150);
      expect(seen.at(-1)).toBe(up);
      await scrollTo(0);
      expect(seen.at(-1)).toBe(true);
    }
  });
});
