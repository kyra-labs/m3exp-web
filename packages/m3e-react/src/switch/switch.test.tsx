import { act, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderReact } from '../test/parity.js';
import { Switch } from './index.js';

afterEach(() => {
  document.body.replaceChildren();
});

const key = async (target: Element, type: 'keydown' | 'keyup', k: string) => {
  await act(async () => {
    target.dispatchEvent(new KeyboardEvent(type, { bubbles: true, cancelable: true, key: k }));
    await Promise.resolve();
  });
};

const parts = (el: Element) => [...el.children].map((c) => `${c.tagName}.${c.className}`);

describe('<Switch>', () => {
  it('renders the m3e-css contract: a labelled native checkbox with role="switch"', async () => {
    const container = await renderReact(
      <Switch defaultSelected name="wifi" value="on">
        Wi-Fi
      </Switch>,
    );
    const root = container.querySelector('label.m3e-switch')!;
    expect(parts(root)).toEqual([
      'INPUT.m3e-switch__input',
      'SPAN.m3e-switch__track',
      'SPAN.m3e-switch__label',
    ]);
    const track = root.querySelector('.m3e-switch__track')!;
    expect(track.getAttribute('aria-hidden')).toBe('true');
    expect(parts(track)).toEqual(['SPAN.m3e-switch__handle']);
    expect(parts(track.firstElementChild!)).toEqual(['SPAN.m3e-switch__state']);
    const input = root.querySelector('input')!;
    expect([
      input.type,
      input.getAttribute('role'),
      input.name,
      input.value,
      input.checked,
    ]).toEqual(['checkbox', 'switch', 'wifi', 'on', true]);
    expect(root.querySelector('.m3e-switch__label')!.textContent).toBe('Wi-Fi');
  });

  it('icons in the handle: checked and unchecked, through the Icon primitive (FILL 1)', async () => {
    const container = await renderReact(
      <Switch checkedIcon="check" uncheckedIcon="close" aria-label="Icons" />,
    );
    const handle = container.querySelector('.m3e-switch__handle')!;
    expect(parts(handle)).toEqual([
      'SPAN.m3e-icon m3e-switch__icon m3e-switch__icon--checked',
      'SPAN.m3e-icon m3e-switch__icon m3e-switch__icon--unchecked',
      'SPAN.m3e-switch__state',
    ]);
    const [check, close] = [...handle.querySelectorAll('.m3e-icon')];
    expect([check!.textContent, close!.textContent]).toEqual(['check', 'close']);
    expect(check!.hasAttribute('data-fill')).toBe(true);
    expect(check!.getAttribute('aria-hidden')).toBe('true');
    // No label text: no __label part, the input carries the name.
    expect(container.querySelector('.m3e-switch__label')).toBeNull();
    expect(container.querySelector('input')!.getAttribute('aria-label')).toBe('Icons');
  });

  it('labelPosition="start" puts the label before the input', async () => {
    const container = await renderReact(<Switch labelPosition="start">Dark theme</Switch>);
    expect(parts(container.querySelector('.m3e-switch')!)).toEqual([
      'SPAN.m3e-switch__label',
      'INPUT.m3e-switch__input',
      'SPAN.m3e-switch__track',
    ]);
  });

  it('toggles on click and calls onChange (uncontrolled and controlled)', async () => {
    const onChange = vi.fn();
    const container = await renderReact(<Switch onChange={onChange}>A</Switch>);
    const input = container.querySelector('input')!;
    await act(async () => {
      input.click();
      await Promise.resolve();
    });
    expect(onChange).toHaveBeenLastCalledWith(true);
    expect(input.checked).toBe(true);

    function Controlled() {
      const [on, setOn] = useState(true);
      return (
        <Switch isSelected={on} onChange={setOn}>
          B
        </Switch>
      );
    }
    const c2 = await renderReact(<Controlled />);
    const b = c2.querySelector('input')!;
    expect(b.checked).toBe(true);
    await act(async () => {
      b.click();
      await Promise.resolve();
    });
    expect(b.checked).toBe(false);
  });

  it('isDisabled and isReadOnly reach the input', async () => {
    const container = await renderReact(
      <>
        <Switch isDisabled>Off</Switch>
        <Switch isReadOnly defaultSelected>
          Locked
        </Switch>
      </>,
    );
    const [disabled, readOnly] = [...container.querySelectorAll('input')];
    expect(disabled!.disabled).toBe(true);
    expect(readOnly!.getAttribute('aria-readonly')).toBe('true');
  });

  it('drives the ripple on the handle circle (Space presses; Enter does not)', async () => {
    const onChange = vi.fn();
    const container = await renderReact(<Switch onChange={onChange}>Keys</Switch>);
    const input = container.querySelector('input')!;
    const state = container.querySelector('.m3e-switch__state')!;
    expect(state.hasAttribute('data-ripple')).toBe(true);
    input.focus();
    await key(input, 'keydown', 'Enter');
    await key(input, 'keyup', 'Enter');
    expect(state.hasAttribute('data-pressed')).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
    await key(input, 'keydown', ' ');
    expect(state.hasAttribute('data-pressed')).toBe(true);
    await key(input, 'keyup', ' ');
    expect(state.hasAttribute('data-pressed')).toBe(false);
  });
});
