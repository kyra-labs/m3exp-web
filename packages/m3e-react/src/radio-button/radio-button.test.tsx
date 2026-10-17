import { act, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderReact } from '../test/parity.js';
import { Radio, RadioGroup } from './index.js';

afterEach(() => {
  document.body.replaceChildren();
});

const options = ['Calls', 'Missed', 'Friends'];

const key = async (target: Element, type: 'keydown' | 'keyup', k: string) => {
  await act(async () => {
    target.dispatchEvent(new KeyboardEvent(type, { bubbles: true, cancelable: true, key: k }));
    await Promise.resolve();
  });
};

describe('<RadioGroup> / <Radio>', () => {
  it('renders the m3e-css contract: a radiogroup of labelled native radios', async () => {
    const container = await renderReact(
      <RadioGroup aria-label="Notifications" defaultValue="Calls" name="n">
        {options.map((o) => (
          <Radio key={o} value={o}>
            {o}
          </Radio>
        ))}
      </RadioGroup>,
    );
    const group = container.querySelector('.m3e-radio-group')!;
    expect(group.getAttribute('role')).toBe('radiogroup');
    expect(group.getAttribute('aria-label')).toBe('Notifications');
    expect(group.getAttribute('aria-orientation')).toBe('vertical');
    const labels = [...group.querySelectorAll(':scope > label.m3e-radio-button')];
    expect(labels).toHaveLength(3);
    const parts = [...labels[0]!.children].map((c) => `${c.tagName}.${c.className}`);
    expect(parts).toEqual([
      'INPUT.m3e-radio-button__input',
      'SPAN.m3e-radio-button__icon',
      'SPAN.m3e-radio-button__state',
      'SPAN.m3e-radio-button__label',
    ]);
    const inputs = [...group.querySelectorAll('input')];
    expect(inputs.map((i) => [i.type, i.name, i.value, i.checked])).toEqual([
      ['radio', 'n', 'Calls', true],
      ['radio', 'n', 'Missed', false],
      ['radio', 'n', 'Friends', false],
    ]);
    expect(labels[0]!.querySelector('.m3e-radio-button__icon')!.getAttribute('aria-hidden')).toBe(
      'true',
    );
    // Roving tab stop: only the selected radio is tabbable.
    expect(inputs.map((i) => i.tabIndex)).toEqual([0, -1, -1]);
  });

  it('selects on click and calls onChange (uncontrolled and controlled)', async () => {
    const onChange = vi.fn();
    const container = await renderReact(
      <RadioGroup aria-label="A" onChange={onChange}>
        <Radio value="a">A</Radio>
        <Radio value="b">B</Radio>
      </RadioGroup>,
    );
    const [a, b] = [...container.querySelectorAll('input')];
    await act(async () => {
      b!.click();
      await Promise.resolve();
    });
    expect(onChange).toHaveBeenCalledWith('b');
    expect(b!.checked).toBe(true);
    expect(a!.checked).toBe(false);

    function Controlled() {
      const [value, setValue] = useState('x');
      return (
        <RadioGroup aria-label="B" value={value} onChange={setValue}>
          <Radio value="x">X</Radio>
          <Radio value="y">Y</Radio>
        </RadioGroup>
      );
    }
    const c2 = await renderReact(<Controlled />);
    const [, y] = [...c2.querySelectorAll('input')];
    await act(async () => {
      y!.click();
      await Promise.resolve();
    });
    expect(y!.checked).toBe(true);
  });

  it('arrow keys move the selection and wrap; disabled radios are skipped', async () => {
    const onChange = vi.fn();
    const container = await renderReact(
      <RadioGroup aria-label="Arrows" defaultValue="a" onChange={onChange}>
        <Radio value="a">A</Radio>
        <Radio value="b" isDisabled>
          B
        </Radio>
        <Radio value="c">C</Radio>
      </RadioGroup>,
    );
    const [a, b, c] = [...container.querySelectorAll('input')];
    expect(b!.disabled).toBe(true);
    a!.focus();
    await key(a!, 'keydown', 'ArrowDown');
    expect(onChange).toHaveBeenLastCalledWith('c');
    expect(c!.checked).toBe(true);
    expect(document.activeElement).toBe(c);
    await key(c!, 'keydown', 'ArrowDown');
    expect(onChange).toHaveBeenLastCalledWith('a');
    expect(document.activeElement).toBe(a);
    await key(a!, 'keydown', 'ArrowUp');
    expect(onChange).toHaveBeenLastCalledWith('c');
  });

  it('orientation, isDisabled and isRequired reach the group and its radios', async () => {
    const container = await renderReact(
      <RadioGroup aria-label="Row" orientation="horizontal" isDisabled isRequired>
        <Radio value="a">A</Radio>
        <Radio value="b" aria-label="B" />
      </RadioGroup>,
    );
    const group = container.querySelector('.m3e-radio-group')!;
    expect(group.getAttribute('aria-orientation')).toBe('horizontal');
    expect(group.getAttribute('aria-disabled')).toBe('true');
    expect(group.getAttribute('aria-required')).toBe('true');
    const inputs = [...container.querySelectorAll('input')];
    expect(inputs.every((i) => i.disabled)).toBe(true);
    // No label text: no __label part, the input carries the name.
    const last = container.querySelectorAll('.m3e-radio-button')[1]!;
    expect(last.querySelector('.m3e-radio-button__label')).toBeNull();
    expect(inputs[1]!.getAttribute('aria-label')).toBe('B');
  });

  it('drives the ripple on the state circle (Space presses; Enter does not)', async () => {
    const container = await renderReact(
      <RadioGroup aria-label="Keys">
        <Radio value="a">A</Radio>
      </RadioGroup>,
    );
    const input = container.querySelector('input')!;
    const state = container.querySelector('.m3e-radio-button__state')!;
    expect(state.hasAttribute('data-ripple')).toBe(true);
    input.focus();
    await key(input, 'keydown', 'Enter');
    expect(state.hasAttribute('data-pressed')).toBe(false);
    await key(input, 'keydown', ' ');
    expect(state.hasAttribute('data-pressed')).toBe(true);
    await key(input, 'keyup', ' ');
    expect(state.hasAttribute('data-pressed')).toBe(false);
  });

  it('a <Radio> outside a <RadioGroup> throws', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(renderReact(<Radio value="a">A</Radio>)).rejects.toThrow(/inside a <RadioGroup>/);
    error.mockRestore();
  });
});
