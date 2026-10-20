import { afterEach, describe, expect, it, vi } from 'vitest';
import '../date-range-picker/index.js';
import '../docked-date-picker/index.js';
import type { DatePickerBaseOptions } from '../date-picker-layout/base.js';
import type { M3eDatePickerElement } from '../date-picker-layout/element.js';
import './index.js';

afterEach(() => {
  document.body.innerHTML = '';
});

const flush = async () => {
  for (let i = 0; i < 3; i++) await Promise.resolve();
};

/** Mounts the markup and waits for the lazily imported layout. */
async function mount(html: string, tag: string) {
  document.body.innerHTML = html;
  await flush();
  const host = document.querySelector(tag)!;
  await (host as unknown as { ready: Promise<void> }).ready;
  await flush();
  return { host, root: host.firstElementChild as HTMLElement };
}

const utc = (y: number, m: number, d: number) => Date.UTC(y, m - 1, d);
const day = (root: Element, millis: number) =>
  root.querySelector<HTMLElement>(`.m3e-date-picker__day[data-date="${String(millis)}"]`)!;
const key = (target: Element, k: string, shiftKey = false) => {
  target.dispatchEvent(new KeyboardEvent('keydown', { key: k, shiftKey, bubbles: true }));
};
/** Waits for the input pane's lazily imported date field. */
const settle = (root: Element) =>
  vi.waitFor(() => {
    expect(root.querySelector('.m3e-text-field__input')).not.toBeNull();
  });
const type = (input: HTMLInputElement, text: string) => {
  for (const ch of text) {
    input.dispatchEvent(new InputEvent('beforeinput', { data: ch, inputType: 'insertText' }));
    const caret = input.selectionStart ?? input.value.length;
    input.value = input.value.slice(0, caret) + ch + input.value.slice(caret);
    input.setSelectionRange(caret + 1, caret + 1);
    input.dispatchEvent(
      new InputEvent('input', { data: ch, inputType: 'insertText', bubbles: true }),
    );
  }
};

describe('<m3e-date-picker>', () => {
  it('renders the m3e-css contract: header, navigation, weekdays and the month grid', async () => {
    const { root } = await mount(
      '<m3e-date-picker value="2025-08-17" lang="en-US"></m3e-date-picker>',
      'm3e-date-picker',
    );
    expect(root.className).toBe('m3e-date-picker');
    expect(root.dataset['mode']).toBe('picker');
    expect(root.querySelector('.m3e-date-picker__title')!.textContent).toBe('Select date');
    const headline = root.querySelector('.m3e-date-picker__headline')!;
    expect(headline.textContent).toBe('Aug 17, 2025');
    expect(headline.getAttribute('aria-label')).toBe('Current selection: Sunday, August 17, 2025');
    expect(root.querySelector('.m3e-date-picker__year-button')!.textContent).toContain(
      'August 2025',
    );
    const weekdays = root.querySelectorAll('.m3e-date-picker__weekdays > *');
    expect(weekdays).toHaveLength(7);
    // en-US weeks start on Sunday (Intl getWeekInfo).
    expect(weekdays[0]!.textContent).toBe('S');
    expect(root.querySelector('.m3e-date-picker__calendar')!.getAttribute('role')).toBe('grid');
    expect(root.querySelectorAll('.m3e-date-picker__week')).toHaveLength(6);
    expect(root.querySelectorAll('.m3e-date-picker__day[data-date]')).toHaveLength(31);
    const selected = day(root, utc(2025, 8, 17));
    expect(selected.getAttribute('aria-selected')).toBe('true');
    expect(selected.tabIndex).toBe(0);
    expect(selected.getAttribute('aria-label')).toBe('Sunday, August 17, 2025');
  });

  it('picks a day: change with the ISO date, the headline follows', async () => {
    const { host, root } = await mount(
      '<m3e-date-picker value="2025-08-17" lang="en-US"></m3e-date-picker>',
      'm3e-date-picker',
    );
    const change = vi.fn();
    host.addEventListener('change', (e) => void change((e as CustomEvent).detail));
    day(root, utc(2025, 8, 5)).click();
    expect(change).toHaveBeenCalledWith({ value: '2025-08-05' });
    expect((host as unknown as { value: string }).value).toBe('2025-08-05');
    expect(root.querySelector('.m3e-date-picker__headline')!.textContent).toBe('Aug 5, 2025');
    expect(day(root, utc(2025, 8, 5)).getAttribute('aria-selected')).toBe('true');
  });

  it('pages months with the arrows and reports displayed-month-change', async () => {
    const { host, root } = await mount(
      '<m3e-date-picker value="2025-08-17" lang="en-US"></m3e-date-picker>',
      'm3e-date-picker',
    );
    const months = vi.fn();
    host.addEventListener('displayed-month-change', (e) => void months((e as CustomEvent).detail));
    const [prev, next] = root.querySelectorAll<HTMLButtonElement>(
      '.m3e-date-picker__arrows > button',
    );
    expect(prev!.getAttribute('aria-label')).toBe('Change to previous month');
    next!.click();
    expect(months).toHaveBeenLastCalledWith({ month: '2025-09' });
    expect(root.querySelector('.m3e-date-picker__year-button')!.textContent).toContain(
      'September 2025',
    );
    prev!.click();
    prev!.click();
    expect(months).toHaveBeenLastCalledWith({ month: '2025-07' });
  });

  it('disables the arrows at the ends of the year range', async () => {
    const { root } = await mount(
      '<m3e-date-picker displayed-month="2030-12" year-range="2025-2030" lang="en-US"></m3e-date-picker>',
      'm3e-date-picker',
    );
    const [prev, next] = root.querySelectorAll<HTMLButtonElement>(
      '.m3e-date-picker__arrows > button',
    );
    expect(next!.disabled).toBe(true);
    expect(prev!.disabled).toBe(false);
  });

  it('is an APG grid: arrows move a day / week, Page Down a month, Enter picks', async () => {
    const { host, root } = await mount(
      '<m3e-date-picker value="2025-08-17" lang="en-US"></m3e-date-picker>',
      'm3e-date-picker',
    );
    const start = day(root, utc(2025, 8, 17));
    start.focus();
    key(start, 'ArrowRight');
    expect(document.activeElement).toBe(day(root, utc(2025, 8, 18)));
    key(document.activeElement!, 'ArrowDown');
    expect(document.activeElement).toBe(day(root, utc(2025, 8, 25)));
    key(document.activeElement!, 'PageDown');
    expect(root.querySelector('.m3e-date-picker__year-button')!.textContent).toContain(
      'September 2025',
    );
    expect(document.activeElement).toBe(day(root, utc(2025, 9, 25)));
    const change = vi.fn();
    host.addEventListener('change', (e) => void change((e as CustomEvent).detail));
    key(document.activeElement!, 'Enter');
    expect(change).toHaveBeenCalledWith({ value: '2025-09-25' });
  });

  it('opens the year grid, picks a year and closes it', async () => {
    const { root } = await mount(
      '<m3e-date-picker value="2025-08-17" year-range="2000-2040" lang="en-US"></m3e-date-picker>',
      'm3e-date-picker',
    );
    const button = root.querySelector<HTMLButtonElement>('.m3e-date-picker__year-button')!;
    expect(button.getAttribute('aria-expanded')).toBe('false');
    button.click();
    expect(root.hasAttribute('data-years')).toBe(true);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    const years = root.querySelectorAll<HTMLElement>('.m3e-date-picker__year');
    expect(years).toHaveLength(41);
    const current = root.querySelector('.m3e-date-picker__year[aria-selected="true"]')!;
    expect(current.textContent).toBe('2025');
    expect(document.activeElement).toBe(current);
    key(current, 'ArrowDown');
    expect(document.activeElement!.textContent).toBe('2028');
    key(document.activeElement!, 'Enter');
    expect(root.hasAttribute('data-years')).toBe(false);
    expect(button.textContent).toContain('August 2028');
    expect(document.activeElement).toBe(button);
  });

  it('switches to the input mode: the date field parses typed digits', async () => {
    const { host, root } = await mount(
      '<m3e-date-picker lang="en-US"></m3e-date-picker>',
      'm3e-date-picker',
    );
    const modes = vi.fn();
    host.addEventListener('display-mode-change', (e) => void modes((e as CustomEvent).detail));
    root.querySelector<HTMLButtonElement>('.m3e-date-picker__mode-toggle')!.click();
    await settle(root);
    await flush();
    expect(modes).toHaveBeenCalledWith({ mode: 'input' });
    expect(root.dataset['mode']).toBe('input');
    expect(root.querySelector('.m3e-date-picker__title')!.textContent).toBe('Select date');
    const input = root.querySelector<HTMLInputElement>('.m3e-text-field__input')!;
    expect(input.getAttribute('placeholder')).toBe('MM/DD/YYYY');
    const change = vi.fn();
    host.addEventListener('change', (e) => void change((e as CustomEvent).detail));
    type(input, '03152024');
    expect(change).toHaveBeenLastCalledWith({ value: '2024-03-15' });
    // Compose's DateOutputTransformation shows the delimiters as the digits come (owner decision
    // M10 D5).
    expect(input.value).toBe('03/15/2024');
  });

  it('shows the validator error for a date outside the year range', async () => {
    const { root } = await mount(
      '<m3e-date-picker display-mode="input" year-range="2000-2030" lang="en-US"></m3e-date-picker>',
      'm3e-date-picker',
    );
    await settle(root);
    const input = root.querySelector<HTMLInputElement>('.m3e-text-field__input')!;
    type(input, '01011999');
    const error = root.querySelector('[role="alert"]');
    expect(error?.textContent).toBe('Date out of expected year range 2000 - 2030');
  });
});

describe('<m3e-date-range-picker>', () => {
  it('selects a start then an end and reports both', async () => {
    const { host, root } = await mount(
      '<m3e-date-range-picker displayed-month="2025-08" lang="en-US"></m3e-date-range-picker>',
      'm3e-date-range-picker',
    );
    expect(root.classList.contains('m3e-date-picker--range')).toBe(true);
    expect(root.querySelector('.m3e-date-picker__title')!.textContent).toBe('Select dates');
    const change = vi.fn();
    host.addEventListener('change', (e) => void change((e as CustomEvent).detail));
    day(root, utc(2025, 8, 10)).click();
    expect(change).toHaveBeenLastCalledWith({ start: '2025-08-10', end: null });
    day(root, utc(2025, 8, 20)).click();
    expect(change).toHaveBeenLastCalledWith({ start: '2025-08-10', end: '2025-08-20' });
    expect(day(root, utc(2025, 8, 15)).hasAttribute('data-in-range')).toBe(true);
    expect(day(root, utc(2025, 8, 10)).getAttribute('aria-label')).toBe(
      'Start date, Sunday, August 10, 2025',
    );
  });
});

describe('<m3e-docked-date-picker>', () => {
  it('opens the calendar from its button, picks a day into the field and closes', async () => {
    const { host, root } = await mount(
      '<m3e-docked-date-picker value="2025-08-17" lang="en-US"></m3e-docked-date-picker>',
      'm3e-docked-date-picker',
    );
    const input = root.querySelector<HTMLInputElement>('.m3e-text-field__input')!;
    expect(input.value).toBe('08/17/2025');
    const popup = root.querySelector<HTMLElement>('.m3e-date-picker--docked')!;
    expect(popup.hidden).toBe(true);
    root.querySelector<HTMLButtonElement>('.m3e-text-field__trailing button')!.click();
    expect(popup.hidden).toBe(false);
    const change = vi.fn();
    host.addEventListener('change', (e) => void change((e as CustomEvent).detail));
    day(popup, utc(2025, 8, 21)).click();
    expect(change).toHaveBeenCalledWith({ value: '2025-08-21' });
    expect(input.value).toBe('08/21/2025');
    expect(popup.hidden).toBe(true);
  });
});

describe('<m3e-docked-date-picker> typing', () => {
  it('a click on the field leaves the calendar closed: the icon is the only way in', async () => {
    const { host, root } = await mount(
      '<m3e-docked-date-picker lang="en-US"></m3e-docked-date-picker>',
      'm3e-docked-date-picker',
    );
    const input = root.querySelector<HTMLInputElement>('.m3e-text-field__input')!;
    input.focus();
    input.click();
    expect(root.querySelector<HTMLElement>('.m3e-date-picker--docked')!.hidden).toBe(true);
    const change = vi.fn();
    host.addEventListener('change', (e) => void change((e as CustomEvent).detail));
    // A non-digit is rejected (DateInputTransformation): the field holds digits only.
    type(input, '08/14');
    expect(input.value).toBe('08/14/');
    // A re-render (an attribute change) keeps the partial text.
    host.setAttribute('label', 'Birthday');
    await flush();
    expect(input.value).toBe('08/14/');
    type(input, '2025');
    expect(change).toHaveBeenLastCalledWith({ value: '2025-08-14' });
    expect(input.value).toBe('08/14/2025');
  });

  it('Shift + M / Shift + Y go to the month / year drop-downs', async () => {
    const { root } = await mount(
      '<m3e-docked-date-picker value="2025-08-17" lang="en-US"></m3e-docked-date-picker>',
      'm3e-docked-date-picker',
    );
    root.querySelector<HTMLButtonElement>('.m3e-text-field__trailing button')!.click();
    const [month, year] = root.querySelectorAll<HTMLButtonElement>('.m3e-date-picker__menu-button');
    key(document.activeElement!, 'M', true);
    expect(document.activeElement).toBe(month);
    key(document.activeElement!, 'Y', true);
    expect(document.activeElement).toBe(year);
  });
});

describe('M3eDatePickerElement', () => {
  it('builds the layout once, after its entry loads', async () => {
    const { host } = await mount('<m3e-date-picker></m3e-date-picker>', 'm3e-date-picker');
    const element = host as unknown as M3eDatePickerElement<
      { update(): void; destroy(): void },
      DatePickerBaseOptions
    >;
    expect(element.controller).toBeDefined();
    expect(host.childElementCount).toBe(1);
  });
});
