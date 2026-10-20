import { afterEach, describe, expect, it, vi } from 'vitest';
import '../time-input/index.js';
import '../time-scroll/index.js';
import './index.js';

afterEach(() => {
  document.body.innerHTML = '';
  vi.useRealTimers();
});

const flush = async () => {
  for (let i = 0; i < 3; i++) await Promise.resolve();
};

async function mount<K extends keyof HTMLElementTagNameMap>(html: string, tag: K) {
  document.body.innerHTML = html;
  await flush();
  const host = document.querySelector(tag)!;
  return { host, root: host.firstElementChild as HTMLElement };
}

const pointer = (target: Element, type: string, x: number, y: number) => {
  target.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      button: 0,
      pointerId: 1,
      pointerType: 'mouse',
      clientX: x,
      clientY: y,
    }),
  );
};

/** A point on the dial (happy-dom lays nothing out: the layout uses the 256dp dial at 0, 0). */
const at = (deg: number, radius = 101) => {
  const rad = (deg * Math.PI) / 180;
  return [128 + radius * Math.cos(rad), 128 + radius * Math.sin(rad)] as const;
};

const stubCapture = (el: Element) => {
  (el as HTMLElement).setPointerCapture = () => undefined;
};

describe('<m3e-time-picker>', () => {
  it('renders the m3e-css contract: selectors, AM/PM, the dial with 12 hour and 12 minute labels', async () => {
    const { root } = await mount(
      '<m3e-time-picker hour="14" minute="23" hour-cycle="12" layout="vertical"></m3e-time-picker>',
      'm3e-time-picker',
    );
    expect(root.className).toBe('m3e-time-picker');
    expect(root.dataset['selection']).toBe('hour');
    const selectors = root.querySelectorAll('.m3e-time-picker__selector');
    expect([...selectors].map((s) => s.textContent)).toEqual(['02', '23']);
    expect(selectors[0]!.getAttribute('role')).toBe('radio');
    expect(selectors[0]!.getAttribute('aria-checked')).toBe('true');
    expect(selectors[0]!.getAttribute('aria-label')).toBe("Select hour, 2 o'clock");
    expect(selectors[1]!.getAttribute('aria-label')).toBe('Select minutes, 23 minutes');
    const period = root.querySelectorAll('.m3e-time-picker__period-item');
    expect([...period].map((p) => [p.textContent, p.getAttribute('aria-checked')])).toEqual([
      ['AM', 'false'],
      ['PM', 'true'],
    ]);
    const hourFace = root.querySelector('.m3e-time-picker__dial > [data-face="hour"]')!;
    expect(hourFace.hasAttribute('data-active')).toBe(true);
    expect([...hourFace.children].map((l) => l.textContent)).toEqual([
      '12',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      '10',
      '11',
    ]);
    const minuteFace = root.querySelector('.m3e-time-picker__dial > [data-face="minute"]')!;
    expect(minuteFace.children[1]!.textContent).toBe('5');
    expect(minuteFace.children[1]!.getAttribute('aria-label')).toBe("5 o'clock");
    // The tab stop is the current hour's label; the selector is over 2 o'clock.
    const two = hourFace.children[2]!;
    expect((two as HTMLElement).tabIndex).toBe(0);
    expect(two.getAttribute('aria-checked')).toBe('true');
    expect(root.querySelector('.m3e-time-picker__highlight')!.getAttribute('aria-hidden')).toBe(
      'true',
    );
  });

  it('24-hour: no AM/PM, the inner circle (12–23), the selector inside for PM hours', async () => {
    const { root } = await mount(
      '<m3e-time-picker hour="15" minute="0" hour-cycle="24" vibrant layout="horizontal"></m3e-time-picker>',
      'm3e-time-picker',
    );
    expect(root.className).toBe(
      'm3e-time-picker m3e-time-picker--vibrant m3e-time-picker--horizontal m3e-time-picker--24h',
    );
    expect(root.querySelector('.m3e-time-picker__period')).toBeNull();
    const labels = root.querySelectorAll('.m3e-time-picker__dial > [data-face="hour"] > *');
    expect(labels).toHaveLength(24);
    expect(labels[0]!.textContent).toBe('0');
    expect(labels[12]!.textContent).toBe('12');
    expect(labels[12]!.classList.contains('m3e-time-picker__label--inner')).toBe(true);
    expect(labels[15]!.getAttribute('aria-label')).toBe('15 hours');
    expect(root.querySelector('.m3e-time-picker__dial')!.hasAttribute('data-inner')).toBe(true);
  });

  it('a tap picks an hour, fires change, and switches to minutes (pointer)', async () => {
    vi.useFakeTimers();
    const { host, root } = await mount(
      '<m3e-time-picker hour="9" minute="30" hour-cycle="12" layout="vertical"></m3e-time-picker>',
      'm3e-time-picker',
    );
    const dial = root.querySelector('.m3e-time-picker__dial')!;
    stubCapture(dial);
    const changes: unknown[] = [];
    host.addEventListener('change', (e) => changes.push((e as CustomEvent).detail));
    const [x, y] = at(0); // 3 o'clock
    pointer(dial, 'pointerdown', x, y);
    pointer(dial, 'pointerup', x, y);
    expect(changes).toEqual([{ hour: 3, minute: 30 }]);
    expect(host.hour).toBe(3);
    expect(root.dataset['selection']).toBe('hour');
    vi.runAllTimers();
    expect(root.dataset['selection']).toBe('minute');
    expect(host.selection).toBe('minute');
  });

  it('a drag follows the pointer and settles on the minutes', async () => {
    const { host, root } = await mount(
      '<m3e-time-picker hour="9" minute="30" hour-cycle="24" layout="vertical"></m3e-time-picker>',
      'm3e-time-picker',
    );
    const dial = root.querySelector('.m3e-time-picker__dial')!;
    stubCapture(dial);
    const [x0, y0] = at(-90); // 12 o'clock
    const [x1, y1] = at(-30); // 2 o'clock
    pointer(dial, 'pointerdown', x0, y0);
    pointer(dial, 'pointermove', x0 + 20, y0 + 5);
    pointer(dial, 'pointermove', x1, y1);
    expect(host.hour).toBe(2);
    pointer(dial, 'pointerup', x1, y1);
    expect(root.dataset['selection']).toBe('minute');
  });

  it('keyboard: arrows loop around the dial; Enter picks without switching to minutes', async () => {
    const { host, root } = await mount(
      '<m3e-time-picker hour="0" minute="5" hour-cycle="12" layout="vertical"></m3e-time-picker>',
      'm3e-time-picker',
    );
    const labels = [
      ...root.querySelectorAll<HTMLElement>('.m3e-time-picker__dial > [data-face="hour"] > *'),
    ];
    expect(labels[0]!.tabIndex).toBe(0);
    labels[0]!.focus();
    labels[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(document.activeElement).toBe(labels[11]);
    labels[11]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(host.hour).toBe(11);
    expect(root.dataset['selection']).toBe('hour');
  });

  it('the AM/PM toggle moves the hour by 12 (arrows switch, as a radio group)', async () => {
    const { host, root } = await mount(
      '<m3e-time-picker hour="9" minute="0" hour-cycle="12" layout="vertical"></m3e-time-picker>',
      'm3e-time-picker',
    );
    const [am, pm] = root.querySelectorAll<HTMLButtonElement>('.m3e-time-picker__period-item');
    expect(am!.tabIndex).toBe(0);
    pm!.click();
    expect(host.hour).toBe(21);
    pm!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(host.hour).toBe(9);
  });

  it('the minute selector switches the dial; attributes set the time', async () => {
    const { host, root } = await mount(
      '<m3e-time-picker hour="9" minute="0" hour-cycle="12" layout="vertical"></m3e-time-picker>',
      'm3e-time-picker',
    );
    root.querySelectorAll<HTMLButtonElement>('.m3e-time-picker__selector')[1]!.click();
    expect(root.dataset['selection']).toBe('minute');
    host.setAttribute('minute', '45');
    await flush();
    expect(root.querySelectorAll('.m3e-time-picker__selector')[1]!.textContent).toBe('45');
  });
});

describe('<m3e-time-input>', () => {
  it('renders two spinbutton fields, supporting text and the AM/PM toggle', async () => {
    const { root } = await mount(
      '<m3e-time-input hour="14" minute="5" hour-cycle="12"></m3e-time-input>',
      'm3e-time-input',
    );
    expect(root.className).toBe('m3e-time-input');
    const inputs = root.querySelectorAll('input');
    expect([...inputs].map((i) => i.value)).toEqual(['02', '05']);
    expect(inputs[0]!.getAttribute('role')).toBe('spinbutton');
    expect(inputs[0]!.getAttribute('aria-label')).toBe('for hour');
    expect(inputs[0]!.getAttribute('aria-valuetext')).toBe("2 o'clock");
    expect(root.querySelector('.m3e-time-input__field')!.hasAttribute('data-selected')).toBe(true);
    expect(
      [...root.querySelectorAll('.m3e-time-input__supporting')].map((s) => s.textContent),
    ).toEqual(['Hour', 'Minute']);
    expect(root.querySelector(':scope > .m3e-time-picker__period')).not.toBeNull();
  });

  it('typing goes through the TimeInputTransformation port and advances to the minutes', async () => {
    const { host, root } = await mount(
      '<m3e-time-input hour="9" minute="0" hour-cycle="24"></m3e-time-input>',
      'm3e-time-input',
    );
    const [hour, minute] = root.querySelectorAll('input');
    hour!.focus();
    hour!.setSelectionRange(0, 2);
    hour!.dispatchEvent(new InputEvent('beforeinput', { bubbles: true }));
    hour!.value = '1';
    hour!.setSelectionRange(1, 1);
    hour!.dispatchEvent(new InputEvent('input', { bubbles: true }));
    expect(host.hour).toBe(1);
    hour!.dispatchEvent(new InputEvent('beforeinput', { bubbles: true }));
    hour!.value = '17';
    hour!.setSelectionRange(2, 2);
    hour!.dispatchEvent(new InputEvent('input', { bubbles: true }));
    expect(host.hour).toBe(17);
    expect(document.activeElement).toBe(minute);
    // A letter is rejected.
    minute!.dispatchEvent(new InputEvent('beforeinput', { bubbles: true }));
    minute!.value = '0a';
    minute!.dispatchEvent(new InputEvent('input', { bubbles: true }));
    expect(minute!.value).toBe('00');
  });

  it('an invalid hour shows the error (live region) and keeps the valid time', async () => {
    const { host, root } = await mount(
      '<m3e-time-input hour="9" minute="0" hour-cycle="12"></m3e-time-input>',
      'm3e-time-input',
    );
    const hour = root.querySelector('input')!;
    hour.focus();
    hour.dispatchEvent(new InputEvent('beforeinput', { bubbles: true }));
    hour.value = '13';
    hour.setSelectionRange(2, 2);
    hour.dispatchEvent(new InputEvent('input', { bubbles: true }));
    expect(host.hour).toBe(9);
    const field = root.querySelector('.m3e-time-input__field')!;
    expect(field.hasAttribute('data-invalid')).toBe(true);
    const supporting = field.querySelector('.m3e-time-input__supporting')!;
    expect(supporting.textContent).toBe('Hour must be 1–12');
    expect(supporting.getAttribute('aria-live')).toBe('polite');
    expect(hour.getAttribute('aria-invalid')).toBe('true');
  });

  it('Up / Down step the field, wrapping (a web spinbutton)', async () => {
    const { host, root } = await mount(
      '<m3e-time-input hour="12" minute="59" hour-cycle="12"></m3e-time-input>',
      'm3e-time-input',
    );
    const [hour, minute] = root.querySelectorAll('input');
    hour!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(host.hour).toBe(23);
    minute!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(host.minute).toBe(0);
  });

  it('uncontained: the side column with AM, PM and the scroll mode toggle', async () => {
    const { host, root } = await mount(
      '<m3e-time-input hour="9" minute="0" hour-cycle="12" uncontained></m3e-time-input>',
      'm3e-time-input',
    );
    expect(root.className).toBe(
      'm3e-time-input m3e-time-input--vibrant m3e-time-input--uncontained',
    );
    const side = root.querySelector('.m3e-time-picker__side')!;
    const toggle = side.querySelector<HTMLButtonElement>('.m3e-icon-button')!;
    expect(toggle.getAttribute('aria-label')).toBe('Switch to scroll mode');
    expect(toggle.textContent).toBe('swipe_vertical');
    const onToggle = vi.fn();
    host.addEventListener('mode-toggle', onToggle);
    toggle.click();
    expect(onToggle).toHaveBeenCalledOnce();
    // Vibrant: no supporting text while valid.
    expect(root.querySelector<HTMLElement>('.m3e-time-input__supporting')!.hidden).toBe(true);
  });
});

describe('<m3e-time-scroll>', () => {
  it('renders two spinbutton wheels; Up / Down move a row', async () => {
    const { host, root } = await mount(
      '<m3e-time-scroll hour="14" minute="5" hour-cycle="12"></m3e-time-scroll>',
      'm3e-time-scroll',
    );
    const [hour, minute] = root.querySelectorAll<HTMLElement>('.m3e-time-scroll__field');
    expect(hour!.getAttribute('role')).toBe('spinbutton');
    expect(hour!.getAttribute('aria-label')).toBe('Select hour');
    expect(hour!.getAttribute('aria-valuetext')).toBe("2 o'clock");
    expect(hour!.querySelector('[data-selected]')!.textContent).toBe('02');
    expect([...minute!.children].map((c) => c.textContent)).toEqual(['03', '04', '05', '06', '07']);
    minute!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    // happy-dom has no CSS: the spring resolves to a jump.
    expect(host.minute).toBe(6);
    hour!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(host.hour).toBe(13);
  });
});

describe('time pickers: M11 API', () => {
  it("the inputs' native input / change stop inside: a host change listener sees only the CustomEvent", async () => {
    const { host, root } = await mount(
      '<m3e-time-input hour="9" minute="0" hour-cycle="24"></m3e-time-input>',
      'm3e-time-input',
    );
    const seen: unknown[] = [];
    host.addEventListener('change', (e: Event) => {
      seen.push(e instanceof CustomEvent ? e.detail : `native ${e.type}`);
    });
    host.addEventListener('input', (e: Event) => {
      seen.push(`native ${e.type}`);
    });
    const hour = root.querySelector('input')!;
    hour.focus();
    hour.setSelectionRange(0, 2);
    hour.dispatchEvent(new InputEvent('beforeinput', { bubbles: true }));
    hour.value = '1';
    hour.setSelectionRange(1, 1);
    hour.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true }));
    hour.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    // The layout's own listeners still ran.
    expect(host.hour).toBe(1);
    expect(seen).toEqual([{ hour: 1, minute: 0 }]);
  });

  it('selection-change carries `value` (M2) and the deprecated `selection`', async () => {
    const { host, root } = await mount(
      '<m3e-time-picker hour="9" minute="30" hour-cycle="12"></m3e-time-picker>',
      'm3e-time-picker',
    );
    const details: unknown[] = [];
    host.addEventListener('selection-change', (e) => details.push(e.detail));
    root.querySelectorAll<HTMLElement>('.m3e-time-picker__selector')[1]!.click();
    expect(details).toEqual([{ value: 'minute', selection: 'minute' }]);
    expect(host.selection).toBe('minute');
  });

  it('mode-toggle is typed on <m3e-time-input> (M1 event map)', async () => {
    const { host, root } = await mount(
      '<m3e-time-input hour="9" minute="0" uncontained></m3e-time-input>',
      'm3e-time-input',
    );
    const details: (null | undefined)[] = [];
    host.addEventListener('mode-toggle', (e) => details.push(e.detail));
    root.querySelector<HTMLButtonElement>('.m3e-time-picker__side .m3e-icon-button')!.click();
    expect(details).toEqual([null]);
  });
});
