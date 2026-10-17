import { afterEach, describe, expect, it } from 'vitest';
import './index.js';
import { type M3eCheckbox, checkboxState } from './checkbox.js';

const flush = async () => {
  for (let i = 0; i < 2; i++) await Promise.resolve();
};

const mount = async (html: string) => {
  document.body.innerHTML = html;
  await flush();
  return document.body.firstElementChild as M3eCheckbox;
};

describe('<m3e-checkbox>', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('renders the m3e-css contract around a native input, with the text as its label', async () => {
    const el = await mount('<m3e-checkbox name="mail" value="daily" checked>Daily</m3e-checkbox>');
    expect(el.style.display).toBe('contents');
    const root = el.firstElementChild!;
    expect(el.children).toHaveLength(1);
    expect(root.localName).toBe('label');
    expect(root.className).toBe('m3e-checkbox');
    expect([...root.children].map((c) => c.className)).toEqual([
      'm3e-checkbox__input',
      'm3e-checkbox__box',
      'm3e-checkbox__state',
      'm3e-checkbox__label',
    ]);
    const input = el.input!;
    expect(input.type).toBe('checkbox');
    expect(input.checked).toBe(true);
    expect(input.name).toBe('mail');
    expect(input.value).toBe('daily');
    const mark = root.querySelector('.m3e-checkbox__box > svg.m3e-checkbox__mark')!;
    expect(mark.namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect([...mark.children].map((p) => [p.getAttribute('class'), p.getAttribute('d')])).toEqual([
      ['m3e-checkbox__stroke', 'M0 0H48'],
      ['m3e-checkbox__stroke', 'M0 0H48'],
    ]);
    expect(root.querySelector('.m3e-checkbox__box')!.getAttribute('aria-hidden')).toBe('true');
    expect(root.querySelector('.m3e-checkbox__state')!.getAttribute('aria-hidden')).toBe('true');
    expect(root.querySelector('.m3e-checkbox__state')!.hasAttribute('data-ripple')).toBe(true);
    expect(root.querySelector('.m3e-checkbox__label')!.textContent).toBe('Daily');
  });

  it('sets the indeterminate property from the attribute (HTML cannot declare it)', async () => {
    const el = await mount('<m3e-checkbox indeterminate>Parent</m3e-checkbox>');
    expect(el.input!.indeterminate).toBe(true);
    el.indeterminate = false;
    await flush();
    expect(el.input!.indeterminate).toBe(false);
  });

  it('maps disabled, invalid, required and label onto the input', async () => {
    const el = await mount('<m3e-checkbox disabled invalid required label="Terms"></m3e-checkbox>');
    const input = el.input!;
    expect(input.disabled).toBe(true);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-required')).toBe('true');
    expect(input.getAttribute('aria-label')).toBe('Terms');
    expect(el.querySelector('.m3e-checkbox__label')).toBeNull();
    el.invalid = false;
    el.required = false;
    await flush();
    expect(input.hasAttribute('aria-invalid')).toBe(false);
    expect(input.hasAttribute('aria-required')).toBe(false);
  });

  it('writes the previous state to data-from on every change', async () => {
    const el = await mount('<m3e-checkbox>Parent</m3e-checkbox>');
    const root = el.firstElementChild!;
    expect(root.hasAttribute('data-from')).toBe(false);
    el.indeterminate = true;
    await flush();
    expect(root.getAttribute('data-from')).toBe('unchecked');
    el.indeterminate = false;
    el.checked = true;
    await flush();
    expect(root.getAttribute('data-from')).toBe('indeterminate');
    el.indeterminate = true;
    await flush();
    expect(root.getAttribute('data-from')).toBe('checked');
    el.disabled = true; // not a state change
    await flush();
    expect(root.getAttribute('data-from')).toBe('checked');
  });

  it('follows a user toggle (the native change clears indeterminate)', async () => {
    const el = await mount('<m3e-checkbox indeterminate>Parent</m3e-checkbox>');
    const changes: boolean[] = [];
    el.addEventListener('change', () => changes.push(el.checked ?? false));
    el.input!.click();
    await flush();
    expect(changes).toEqual([true]);
    expect(el.checked).toBe(true);
    expect(el.indeterminate).toBe(false);
    expect(el.firstElementChild!.getAttribute('data-from')).toBe('indeterminate');
    el.input!.click();
    await flush();
    expect(el.checked).toBe(false);
  });

  it('keeps its DOM and listeners across a move', async () => {
    const el = await mount('<m3e-checkbox>Move</m3e-checkbox>');
    const input = el.input!;
    const other = document.createElement('div');
    document.body.append(other);
    other.append(el);
    await flush();
    expect(el.input).toBe(input);
    expect(el.querySelectorAll('input')).toHaveLength(1);
    input.click();
    await flush();
    expect(el.checked).toBe(true);
    expect(el.querySelector('.m3e-checkbox__state')!.hasAttribute('data-ripple')).toBe(true);
  });

  it('ripples on Space, not Enter', async () => {
    const el = await mount('<m3e-checkbox>Keys</m3e-checkbox>');
    const state = el.querySelector('.m3e-checkbox__state')!;
    const key = (type: string, k: string) =>
      el.input!.dispatchEvent(new KeyboardEvent(type, { bubbles: true, key: k }));
    key('keydown', 'Enter');
    expect(state.hasAttribute('data-pressed')).toBe(false);
    key('keydown', ' ');
    expect(state.hasAttribute('data-pressed')).toBe(true);
    key('keyup', ' ');
    expect(state.hasAttribute('data-pressed')).toBe(false);
  });

  it('checkboxState: indeterminate wins over checked', () => {
    expect(checkboxState(false, false)).toBe('unchecked');
    expect(checkboxState(true, false)).toBe('checked');
    expect(checkboxState(true, true)).toBe('indeterminate');
    expect(checkboxState(false, true)).toBe('indeterminate');
  });
});
