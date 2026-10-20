import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import './index.js';
// The overflow button's tooltip controller is imported when the button is first rendered; loaded
// here so that import resolves at once (and never after a test file's environment is torn down).
import '@kyralabs/m3e-elements/tooltip-popup.js';
import type { M3eButtonGroup, M3eButtonGroupItem } from './button-group.js';

// happy-dom has no layout: sizes are stubbed where a test needs them; frames run on demand.
let frames: FrameRequestCallback[] = [];
const settle = async () => {
  for (let i = 0; i < 4; i++) await Promise.resolve();
};

beforeEach(() => {
  frames = [];
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function setup(html: string) {
  document.body.innerHTML = html;
  await settle();
  const host = document.querySelector<M3eButtonGroup>('m3e-button-group')!;
  const group = host.groupElement!;
  const buttons = () => [...group.querySelectorAll<HTMLButtonElement>('.m3e-button-group__item')];
  const key = (k: string, target: Element = document.activeElement ?? group) => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
  };
  return { host, group, buttons, key };
}

const STANDARD = `
  <m3e-button-group label="Text">
    <m3e-button-group-item value="bold" icon="format_bold">Bold</m3e-button-group-item>
    <m3e-button-group-item value="italic">Italic</m3e-button-group-item>
    <m3e-button-group-item value="off" disabled>Off</m3e-button-group-item>
    <m3e-button-group-item value="under" label="Underline" icon="format_underlined"></m3e-button-group-item>
  </m3e-button-group>`;

describe('<m3e-button-group> contract', () => {
  it('renders the .m3e-button-group of .m3e-button items (standard, s, round, filled)', async () => {
    const { host, group, buttons } = await setup(STANDARD);
    expect(group.parentElement).toBe(host);
    expect(group.className).toBe(
      'm3e-button-group m3e-button-group--standard m3e-button-group--size-s',
    );
    expect(group.getAttribute('role')).toBe('group');
    expect(group.getAttribute('aria-label')).toBe('Text');
    const [bold, italic, off, under] = buttons();
    expect(buttons()).toHaveLength(4);
    expect(bold!.className).toBe(
      'm3e-button m3e-button--filled m3e-button--size-s m3e-button--round m3e-button-group__item',
    );
    expect(bold!.getAttribute('type')).toBe('button');
    expect(bold!.hasAttribute('data-spring')).toBe(true);
    expect(bold!.hasAttribute('data-ripple')).toBe(true);
    expect(bold!.innerHTML).toBe(
      '<span class="m3e-icon" aria-hidden="true">format_bold</span>Bold',
    );
    expect(italic!.hasAttribute('aria-pressed')).toBe(false);
    expect(off!.disabled).toBe(true);
    expect(under!.getAttribute('aria-label')).toBe('Underline');
    // Item data children stay hidden.
    expect(host.querySelector<M3eButtonGroupItem>('m3e-button-group-item')!.hidden).toBe(true);
  });

  it('variant, size, shape and button-variant map to the m3e-css modifiers', async () => {
    const { group, buttons } = await setup(`
      <m3e-button-group variant="connected" size="xl" shape="square" button-variant="tonal">
        <m3e-button-group-item>A</m3e-button-group-item>
        <m3e-button-group-item variant="outlined">B</m3e-button-group-item>
      </m3e-button-group>`);
    expect(group.className).toBe(
      'm3e-button-group m3e-button-group--connected m3e-button-group--size-xl',
    );
    expect(buttons()[0]!.className).toBe(
      'm3e-button m3e-button--tonal m3e-button--size-xl m3e-button--square m3e-button-group__item',
    );
    expect(buttons()[1]!.className).toContain('m3e-button--outlined');
  });

  it('re-renders when items change', async () => {
    const { host, buttons } = await setup(STANDARD);
    host.querySelector('m3e-button-group-item')!.remove();
    await settle();
    expect(buttons()).toHaveLength(3);
    expect(buttons()[0]!.textContent).toBe('Italic');
  });
});

describe('selection', () => {
  const SINGLE = `
    <m3e-button-group variant="connected" selection-mode="single" label="View">
      <m3e-button-group-item value="day" selected>Day</m3e-button-group-item>
      <m3e-button-group-item value="week">Week</m3e-button-group-item>
      <m3e-button-group-item value="month">Month</m3e-button-group-item>
    </m3e-button-group>`;

  it('single: a radiogroup of radios; clicking selects and emits change', async () => {
    const { host, group, buttons } = await setup(SINGLE);
    expect(group.getAttribute('role')).toBe('radiogroup');
    expect(buttons().map((b) => [b.getAttribute('role'), b.getAttribute('aria-checked')])).toEqual([
      ['radio', 'true'],
      ['radio', 'false'],
      ['radio', 'false'],
    ]);
    const changes: unknown[] = [];
    host.addEventListener('change', (e) => changes.push((e as CustomEvent).detail));
    const actions: unknown[] = [];
    host.addEventListener('action', (e) => actions.push((e as CustomEvent).detail));
    buttons()[1]!.click();
    await settle();
    expect(buttons().map((b) => b.getAttribute('aria-checked'))).toEqual([
      'false',
      'true',
      'false',
    ]);
    expect(changes).toEqual([{ value: 'week', selected: true, values: ['week'] }]);
    expect(actions).toEqual([{ value: 'week' }]);
    expect(host.values).toEqual(['week']);
    // React Aria toggle-group semantics: clicking the selected radio clears it…
    buttons()[1]!.click();
    await settle();
    expect(host.values).toEqual([]);
  });

  it('single + selection-required keeps one item selected', async () => {
    const { host, buttons } = await setup(
      SINGLE.replace('label="View"', 'label="View" selection-required'),
    );
    buttons()[0]!.click();
    await settle();
    expect(host.values).toEqual(['day']);
  });

  it('multiple: toggle buttons with aria-pressed', async () => {
    const { host, group, buttons } = await setup(`
      <m3e-button-group selection-mode="multiple">
        <m3e-button-group-item value="a">A</m3e-button-group-item>
        <m3e-button-group-item value="b" selected>B</m3e-button-group-item>
      </m3e-button-group>`);
    expect(group.getAttribute('role')).toBe('group');
    expect(buttons().map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'true']);
    buttons()[0]!.click();
    await settle();
    expect(host.values).toEqual(['a', 'b']);
    expect(buttons()[0]!.getAttribute('aria-pressed')).toBe('true');
  });

  it('disabled items and groups do not activate', async () => {
    const { host, buttons } = await setup(STANDARD);
    const actions: unknown[] = [];
    host.addEventListener('action', (e) => actions.push((e as CustomEvent).detail));
    host.disabled = true;
    await settle();
    expect(buttons().every((b) => b.disabled)).toBe(true);
  });
});

describe('keyboard (roving tabindex)', () => {
  it('one tab stop; arrows, Home and End move focus and skip disabled items', async () => {
    const { buttons, key } = await setup(STANDARD);
    expect(buttons().map((b) => b.getAttribute('tabindex'))).toEqual(['0', '-1', '-1', '-1']);
    buttons()[0]!.focus();
    key('ArrowRight');
    expect(document.activeElement).toBe(buttons()[1]);
    await settle();
    expect(buttons().map((b) => b.getAttribute('tabindex'))).toEqual(['-1', '0', '-1', '-1']);
    key('ArrowRight');
    expect(document.activeElement).toBe(buttons()[3]);
    key('ArrowRight');
    expect(document.activeElement).toBe(buttons()[3]);
    key('Home');
    expect(document.activeElement).toBe(buttons()[0]);
    key('End');
    expect(document.activeElement).toBe(buttons()[3]);
    key('ArrowLeft');
    expect(document.activeElement).toBe(buttons()[1]);
  });

  it('the checked radio holds the tab stop until another item is focused', async () => {
    const { buttons } = await setup(`
      <m3e-button-group selection-mode="single">
        <m3e-button-group-item>A</m3e-button-group-item>
        <m3e-button-group-item selected>B</m3e-button-group-item>
      </m3e-button-group>`);
    expect(buttons().map((b) => b.getAttribute('tabindex'))).toEqual(['-1', '0']);
  });
});

describe('overflow', () => {
  it('hides the trailing items that do not fit and lists them in a baseline <m3e-menu>', async () => {
    const width = (el: Element) =>
      el.classList.contains('m3e-button-group__overflow')
        ? 40
        : el.classList.contains('m3e-button-group__item')
          ? 100
          : 0;
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement,
    ) {
      return {
        width: width(this),
        height: 40,
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      } as DOMRect;
    });
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (
      this: HTMLElement,
    ) {
      return this.classList.contains('m3e-button-group') ? 300 : 0;
    });
    const { group, buttons } = await setup(`
      <m3e-button-group overflow selection-mode="multiple" label="Tools">
        <m3e-button-group-item value="a">A</m3e-button-group-item>
        <m3e-button-group-item value="b">B</m3e-button-group-item>
        <m3e-button-group-item value="c" selected icon="star">C</m3e-button-group-item>
        <m3e-button-group-item value="d">D</m3e-button-group-item>
      </m3e-button-group>`);
    expect(group.classList.contains('m3e-button-group--overflow')).toBe(true);
    // 4 × 100 > 300: 300 − 40 = 260 → A (148 left), B (36 left), C does not fit.
    expect(buttons().map((b) => b.hidden)).toEqual([false, false, true, true]);
    const trigger = group.querySelector<HTMLButtonElement>('.m3e-button-group__overflow')!;
    expect(trigger.hidden).toBe(false);
    expect(trigger.className).toBe(
      'm3e-icon-button m3e-icon-button--filled m3e-icon-button--size-s m3e-icon-button--width-default m3e-icon-button--round m3e-button-group__overflow',
    );
    expect(trigger.getAttribute('aria-label')).toBe('More options');
    expect(trigger.getAttribute('aria-haspopup')).toBe('true');
    // OverflowIndicator's built-in plain tooltip follows the button (owner decision M9 #30).
    expect(trigger.nextElementSibling!.className).toBe('m3e-tooltip');
    const menu = group.querySelector('m3e-menu')!;
    expect(menu.getAttribute('variant')).toBe('baseline');
    expect(menu.getAttribute('anchor')).toBe(trigger.id);
    const entries = [...menu.querySelectorAll('m3e-menu-item')];
    expect(
      entries.map((e) => [e.textContent, e.getAttribute('type'), e.hasAttribute('checked')]),
    ).toEqual([
      ['C', 'checkbox', true],
      ['D', 'checkbox', false],
    ]);
    expect(entries[0]!.getAttribute('icon')).toBe('star');
  });

  it('the overflow button has a plain tooltip of its name above it, aria-hidden (M9 #30, #2)', async () => {
    const { host, group } = await setup(`
      <m3e-button-group overflow>
        <m3e-button-group-item>A</m3e-button-group-item>
      </m3e-button-group>`);
    const trigger = group.querySelector<HTMLButtonElement>('.m3e-button-group__overflow')!;
    const tip = group.querySelector<HTMLElement>('.m3e-tooltip')!;
    expect([...group.children].map((c) => c.className.split(' ').at(-1) ?? c.localName)).toEqual([
      'm3e-button-group__item',
      'm3e-button-group__overflow',
      'm3e-tooltip',
    ]);
    expect([
      tip.getAttribute('role'),
      tip.getAttribute('popover'),
      tip.getAttribute('aria-hidden'),
      tip.textContent,
    ]).toEqual(['tooltip', 'manual', 'true', 'More options']);
    expect(tip.id).not.toBe('');
    expect(tip.id).not.toBe(trigger.id);
    expect(trigger.hasAttribute('aria-describedby')).toBe(false);
    // The TooltipController (rememberTooltipState: not persistent) runs it: hover shows it, and it
    // hides --m3e-comp-tooltip-duration after the pointer leaves (owner decision M9 #1).
    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    tip.style.setProperty('--m3e-comp-tooltip-duration', '1500ms');
    trigger.hidden = false;
    trigger.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    await settle();
    expect(tip.hasAttribute('data-positioned')).toBe(true);
    trigger.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }));
    vi.advanceTimersByTime(1499);
    expect(tip.hasAttribute('data-positioned')).toBe(true);
    vi.advanceTimersByTime(1);
    for (const cb of frames.splice(0)) cb(performance.now() + 10_000);
    expect(tip.hasAttribute('data-positioned')).toBe(false);
    // overflow-label renames the button and its tooltip.
    host.overflowLabel = 'More formatting';
    await settle();
    expect([trigger.getAttribute('aria-label'), tip.textContent]).toEqual([
      'More formatting',
      'More formatting',
    ]);
  });

  it('shows the overflow button only when items are hidden', async () => {
    const { group } = await setup(`
      <m3e-button-group overflow>
        <m3e-button-group-item>A</m3e-button-group-item>
      </m3e-button-group>`);
    expect(group.querySelector<HTMLElement>('.m3e-button-group__overflow')!.hidden).toBe(true);
    expect(group.querySelector('m3e-menu')).toBeNull();
  });

  it('connected groups never overflow', async () => {
    const { group } = await setup(`
      <m3e-button-group variant="connected" overflow>
        <m3e-button-group-item>A</m3e-button-group-item>
      </m3e-button-group>`);
    expect(group.classList.contains('m3e-button-group--overflow')).toBe(false);
    expect(group.querySelector('.m3e-button-group__overflow')).toBeNull();
  });
});

describe('press width springs (ButtonGroupLayout)', () => {
  it('a pressed item grows by ExpandedRatio, its neighbor shrinks, and both rest after release', async () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement,
    ) {
      return { width: 100, height: 40 } as DOMRect;
    });
    const tokens: Record<string, string> = {
      '--m3e-comp-button-group-expanded-ratio': '0.15',
      '--m3e-comp-button-group-release-threshold': '0.75',
      '--m3e-comp-button-group-release-max-wait': '1000ms',
      // No springs in happy-dom: duration 0 jumps (as reduced motion does).
      '--m3e-comp-button-group-width-spring-duration': '0ms',
    };
    const real = window.getComputedStyle.bind(window);
    vi.spyOn(window, 'getComputedStyle').mockImplementation((el: Element) => {
      const style = real(el);
      return new Proxy(style, {
        get(target, prop) {
          if (prop === 'getPropertyValue') {
            return (name: string) => tokens[name] ?? target.getPropertyValue(name);
          }
          if (prop === 'paddingInlineEnd') return '16px';
          const v = Reflect.get(target, prop) as unknown;
          return typeof v === 'function' ? (v as () => unknown).bind(target) : v;
        },
      });
    });
    const { buttons } = await setup(`
      <m3e-button-group>
        <m3e-button-group-item>A</m3e-button-group-item>
        <m3e-button-group-item>B</m3e-button-group-item>
      </m3e-button-group>`);
    const [a, b] = buttons();
    a!.setAttribute('data-pressed', '');
    await settle();
    for (const cb of frames.splice(0)) cb(performance.now());
    // First item: min(0.15 × 100, B's 16px end padding) = 15.
    expect(a!.style.getPropertyValue('inline-size')).toBe('115px');
    expect(b!.style.getPropertyValue('inline-size')).toBe('85px');
    expect(b!.style.getPropertyValue('min-inline-size')).toBe('0');
    a!.removeAttribute('data-pressed');
    await settle();
    for (let i = 0; i < 5; i++) for (const cb of frames.splice(0)) cb(performance.now());
    expect(a!.style.getPropertyValue('inline-size')).toBe('');
    expect(b!.style.getPropertyValue('inline-size')).toBe('');
  });
});

describe('<m3e-button-group>: M11 API', () => {
  const SINGLE_GROUP = `
    <m3e-button-group selection-mode="single" label="View">
      <m3e-button-group-item value="day" selected>Day</m3e-button-group-item>
      <m3e-button-group-item value="week">Week</m3e-button-group-item>
    </m3e-button-group>`;

  it('dispatches selection-change with the change detail; the deprecated change still fires', async () => {
    const { host, buttons } = await setup(SINGLE_GROUP);
    const events: [string, unknown][] = [];
    host.addEventListener('selection-change', (e) => events.push([e.type, e.detail]));
    host.addEventListener('change', (e) => events.push([e.type, e.detail]));
    buttons()[1]!.click();
    await settle();
    const detail = { value: 'week', selected: true, values: ['week'] };
    expect(events).toEqual([
      ['selection-change', detail],
      ['change', detail],
    ]);
  });

  it('disallow-empty-selection keeps one item selected; it wins over selection-required', async () => {
    const { host, buttons } = await setup(
      SINGLE_GROUP.replace('label="View"', 'label="View" disallow-empty-selection'),
    );
    buttons()[0]!.click();
    await settle();
    expect(host.values).toEqual(['day']);
    // The new name wins when both are set.
    host.disallowEmptySelection = false;
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- the 1.x alias (D16)
    host.selectionRequired = true;
    await settle();
    buttons()[0]!.click();
    await settle();
    expect(host.values).toEqual([]);
  });
});
