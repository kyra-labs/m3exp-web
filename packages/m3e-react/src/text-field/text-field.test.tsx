import '@kyralabs/m3e-elements/text-field.js';
import { act, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { canonical, renderElement, renderReact } from '../test/parity.js';
import { TextField } from './index.js';

afterEach(() => {
  document.body.replaceChildren();
});

/**
 * The contract without ids (React Aria's useId vs the element's counter) and the attributes that
 * reference them.
 */
const contract = (root: Element) => {
  const clone = root.cloneNode(true) as Element;
  for (const node of [clone, ...clone.querySelectorAll('*')]) {
    for (const name of ['id', 'for', 'aria-labelledby', 'aria-describedby']) {
      node.removeAttribute(name);
    }
  }
  return canonical(clone);
};

/** Types into a React-controlled input (React tracks the native value setter). */
const type = async (input: HTMLInputElement | HTMLTextAreaElement, text: string) => {
  const proto = Object.getPrototypeOf(input) as object;
  const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
  await act(async () => {
    descriptor?.set?.call(input, text);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await Promise.resolve();
  });
};

describe('element / React DOM parity (CLAUDE.md "Done means" #8)', () => {
  const cases: [string, React.ReactNode][] = [
    ['<m3e-text-field label="Email"></m3e-text-field>', <TextField label="Email" />],
    [
      '<m3e-text-field label="Name" value="Ada" supporting-text="As on your passport" name="n"></m3e-text-field>',
      <TextField label="Name" defaultValue="Ada" description="As on your passport" name="n" />,
    ],
    [
      '<m3e-text-field variant="outlined" label="Search" leading-icon="search" trailing-icon="mic" prefix-text="@" suffix-text=".dev" placeholder="you"></m3e-text-field>',
      <TextField
        variant="outlined"
        label="Search"
        leadingIcon="search"
        trailingIcon="mic"
        prefix="@"
        suffix=".dev"
        placeholder="you"
      />,
    ],
    [
      '<m3e-text-field variant="outlined" label="User" value="toolong" maxlength="5" invalid error-text="Too long" required></m3e-text-field>',
      <TextField
        variant="outlined"
        label="User"
        defaultValue="toolong"
        maxLength={5}
        isInvalid
        errorMessage="Too long"
        isRequired
      />,
    ],
    [
      '<m3e-text-field label="Notes" multiline disabled readonly value="Hi"></m3e-text-field>',
      <TextField label="Notes" multiline isDisabled isReadOnly defaultValue="Hi" />,
    ],
    [
      '<m3e-text-field variant="outlined" label-position="above" label="Above"></m3e-text-field>',
      <TextField variant="outlined" labelPosition="above" label="Above" />,
    ],
  ];

  it.each(cases)('%s', async (html, ui) => {
    const host = await renderElement(html);
    const react = await renderReact(ui);
    expect(contract(react.querySelector('.m3e-text-field')!)).toBe(
      contract(host.querySelector('.m3e-text-field')!),
    );
  });
});

describe('<TextField>', () => {
  it('labels the native input and wires describedby to the supporting text and counter', async () => {
    const root = await renderReact(<TextField label="Bio" description="Public" maxLength={20} />);
    const input = root.querySelector('input')!;
    const label = root.querySelector('label')!;
    expect(label.htmlFor).toBe(input.id);
    const ids = input.getAttribute('aria-describedby')!.split(' ');
    expect(ids).toEqual([
      root.querySelector('.m3e-text-field__supporting-text')!.id,
      root.querySelector('.m3e-text-field__counter')!.id,
    ]);
    expect(input.getAttribute('placeholder')).toBe(' ');
  });

  it('counts characters as the user types (uncontrolled and controlled)', async () => {
    const onChange = vi.fn();
    const root = await renderReact(<TextField label="Bio" maxLength={10} onChange={onChange} />);
    const input = root.querySelector('input')!;
    await type(input, 'Hello');
    expect(onChange).toHaveBeenLastCalledWith('Hello');
    expect(root.querySelector('.m3e-text-field__counter')!.textContent).toBe(
      'Character count, 5/10',
    );

    function Controlled() {
      const [value, setValue] = useState('ab');
      return <TextField label="C" value={value} onChange={setValue} maxLength={4} />;
    }
    const controlled = await renderReact(<Controlled />);
    const field = controlled.querySelector('input')!;
    expect(controlled.querySelector('.m3e-text-field__counter')!.textContent).toBe(
      'Character count, 2/4',
    );
    await type(field, 'abc');
    expect(field.value).toBe('abc');
    expect(controlled.querySelector('.m3e-text-field__counter')!.textContent).toBe(
      'Character count, 3/4',
    );
  });

  it('error: aria-invalid, the error message replaces the supporting text, with the alert role', async () => {
    const root = await renderReact(
      <TextField label="User" description="Help" isInvalid errorMessage="Taken" />,
    );
    const input = root.querySelector('input')!;
    const message = root.querySelector('.m3e-text-field__supporting-text')!;
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(message.textContent).toBe('Taken');
    expect(message.getAttribute('role')).toBe('alert');
    expect(input.getAttribute('aria-describedby')).toBe(message.id);
  });

  it('invalid without a message: aria-invalid only, the supporting text stays', async () => {
    const root = await renderReact(<TextField label="User" description="Help" isInvalid />);
    expect(root.querySelector('input')!.getAttribute('aria-invalid')).toBe('true');
    expect(root.querySelector('.m3e-text-field__supporting-text')!.textContent).toBe('Help');
  });

  it('a node in an icon slot is not hidden (an interactive trailing icon button)', async () => {
    const root = await renderReact(
      <TextField label="Search" trailingIcon={<button type="button">Clear</button>} />,
    );
    const trailing = root.querySelector('.m3e-text-field__trailing')!;
    expect(trailing.hasAttribute('aria-hidden')).toBe(false);
    expect(trailing.querySelector('button')!.textContent).toBe('Clear');
  });

  it('forwards the ref to the native field', async () => {
    const ref = { current: null as HTMLInputElement | HTMLTextAreaElement | null };
    await renderReact(<TextField label="A" multiline ref={ref} />);
    expect(ref.current?.localName).toBe('textarea');
  });
});
