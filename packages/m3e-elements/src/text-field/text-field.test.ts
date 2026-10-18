import { afterEach, describe, expect, it } from 'vitest';
import './index.js';
import {
  textFieldClassName,
  textFieldCounterText,
  textFieldDescribedBy,
} from '../text-field-layout/text-field-layout.js';
import type { M3eTextField } from './text-field.js';

const flush = async () => {
  for (let i = 0; i < 2; i++) await Promise.resolve();
};

const mount = async (html: string) => {
  document.body.innerHTML = html;
  await flush();
  return document.body.firstElementChild as M3eTextField;
};

const classes = (root: Element) => [...root.children].map((c) => c.className);

describe('text-field-layout', () => {
  it('class names: filled adds no modifier; outlined, above and multiline do', () => {
    expect(textFieldClassName({})).toBe('m3e-text-field');
    expect(textFieldClassName({ variant: 'filled', labelPosition: 'inside' })).toBe(
      'm3e-text-field',
    );
    expect(
      textFieldClassName({ variant: 'outlined', labelPosition: 'above', multiline: true }),
    ).toBe(
      'm3e-text-field m3e-text-field--outlined m3e-text-field--label-above m3e-text-field--multiline',
    );
  });

  it('counter text and describedby lists', () => {
    expect(textFieldCounterText(5, 20)).toBe('5/20');
    expect(textFieldDescribedBy('a', undefined, '', 'b')).toBe('a b');
    expect(textFieldDescribedBy(undefined, null)).toBeUndefined();
  });
});

describe('<m3e-text-field>', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('renders the filled contract around a native input with a label for it', async () => {
    const el = await mount(
      '<m3e-text-field label="Email" name="email" value="a@b.c"></m3e-text-field>',
    );
    expect(el.style.display).toBe('contents');
    const root = el.firstElementChild!;
    expect(root.className).toBe('m3e-text-field');
    expect(classes(root)).toEqual(['m3e-text-field__container']);
    const container = root.firstElementChild!;
    expect(classes(container)).toEqual(['m3e-text-field__label', 'm3e-text-field__input']);
    const input = el.input as HTMLInputElement;
    const label = container.querySelector('label')!;
    expect(label.htmlFor).toBe(input.id);
    expect(input.getAttribute('aria-labelledby')).toBe(label.id);
    expect(input.type).toBe('text');
    expect(input.name).toBe('email');
    expect(input.value).toBe('a@b.c');
    expect(input.defaultValue).toBe('a@b.c');
    // The resting label reads :placeholder-shown, so an input always has a placeholder.
    expect(input.getAttribute('placeholder')).toBe(' ');
  });

  it('outlined: the outline fieldset with the label text in its notch legend', async () => {
    const el = await mount(
      '<m3e-text-field variant="outlined" label="Name" leading-icon="person" trailing-icon="mic" prefix-text="@" suffix-text=".dev"></m3e-text-field>',
    );
    const root = el.firstElementChild!;
    expect(root.className).toBe('m3e-text-field m3e-text-field--outlined');
    const container = root.firstElementChild!;
    expect(classes(container)).toEqual([
      'm3e-text-field__leading',
      'm3e-text-field__label',
      'm3e-text-field__prefix',
      'm3e-text-field__input',
      'm3e-text-field__suffix',
      'm3e-text-field__trailing',
      'm3e-text-field__outline',
    ]);
    const outline = container.lastElementChild!;
    expect(outline.localName).toBe('fieldset');
    expect(outline.getAttribute('aria-hidden')).toBe('true');
    expect(outline.querySelector('legend.m3e-text-field__notch > span')!.textContent).toBe('Name');
    const leading = container.firstElementChild!;
    expect(leading.getAttribute('aria-hidden')).toBe('true');
    expect(leading.querySelector('.m3e-icon')!.textContent).toBe('person');
  });

  it('label above: no notch legend (the label never sits on the outline)', async () => {
    const el = await mount(
      '<m3e-text-field variant="outlined" label-position="above" label="Name"></m3e-text-field>',
    );
    const root = el.firstElementChild!;
    expect(root.className).toBe(
      'm3e-text-field m3e-text-field--outlined m3e-text-field--label-above',
    );
    expect(root.querySelector('.m3e-text-field__notch')).toBeNull();
    expect(root.querySelector('fieldset.m3e-text-field__outline')).not.toBeNull();
  });

  it('supporting text, error text (the alert role) and aria states', async () => {
    const el = await mount(
      '<m3e-text-field label="User" supporting-text="Help" error-text="Too long" required></m3e-text-field>',
    );
    const input = el.input!;
    const message = () => el.querySelector('.m3e-text-field__supporting-text')!;
    expect(message().textContent).toBe('Help');
    expect(message().getAttribute('role')).toBeNull();
    expect(input.getAttribute('aria-describedby')).toBe(message().id);
    expect(input.getAttribute('aria-required')).toBe('true');
    expect(input.hasAttribute('aria-invalid')).toBe(false);
    el.invalid = true;
    await flush();
    expect(message().textContent).toBe('Too long');
    expect(message().getAttribute('role')).toBe('alert');
    expect(el.input!.getAttribute('aria-invalid')).toBe('true');
    expect(el.input!.getAttribute('aria-describedby')).toBe(message().id);
  });

  it('the live counter follows what the user types', async () => {
    const el = await mount(
      '<m3e-text-field label="Bio" maxlength="20" value="Hi"></m3e-text-field>',
    );
    const input = el.input!;
    const counter = el.querySelector('.m3e-text-field__counter')!;
    expect(counter.textContent).toBe('Character count, 2/20');
    expect(counter.querySelector('.m3e-text-field__a11y')!.textContent).toBe('Character count, ');
    expect(input.getAttribute('maxlength')).toBe('20');
    expect(input.getAttribute('aria-describedby')).toBe(counter.id);
    const focusBefore = input;
    input.value = 'Hello';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await flush();
    expect(el.value).toBe('Hello');
    expect(counter.textContent).toBe('Character count, 5/20');
    expect(el.input).toBe(focusBefore);
  });

  it('multiline: a one-row textarea; disabled and read-only on the native field', async () => {
    const el = await mount(
      '<m3e-text-field label="Notes" multiline disabled readonly value="Line"></m3e-text-field>',
    );
    const area = el.input as HTMLTextAreaElement;
    expect(area.localName).toBe('textarea');
    expect(area.getAttribute('rows')).toBe('1');
    expect(area.disabled).toBe(true);
    expect(area.readOnly).toBe(true);
    expect(area.value).toBe('Line');
    expect(el.firstElementChild!.className).toBe('m3e-text-field m3e-text-field--multiline');
  });

  it('keeps the input element (and its value) when other parts change', async () => {
    const el = await mount('<m3e-text-field label="A"></m3e-text-field>');
    const input = el.input!;
    input.value = 'typed';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await flush();
    el.setAttribute('leading-icon', 'search');
    el.setAttribute('supporting-text', 'Now with help');
    await flush();
    expect(el.input).toBe(input);
    expect(input.value).toBe('typed');
    expect(el.querySelector('.m3e-text-field__leading')).not.toBeNull();
  });
});
