import '@kyralabs/m3e-elements/checkbox.js';
import { CHECKBOX_SEGMENT_PATH } from '@kyralabs/m3e-elements/checkbox.js';
import { act, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { elementContract, reactContract, renderElement, renderReact } from '../test/parity.js';
import { Checkbox } from './index.js';

afterEach(() => {
  document.body.replaceChildren();
});

const flush = async () => {
  for (let i = 0; i < 2; i++) await Promise.resolve();
};

describe('<Checkbox>', () => {
  it('renders the same DOM as <m3e-checkbox> (CLAUDE.md "Done means" #8)', async () => {
    const cases: [string, React.ReactNode][] = [
      ['<m3e-checkbox>Daily</m3e-checkbox>', <Checkbox>Daily</Checkbox>],
      [
        '<m3e-checkbox checked name="mail" value="weekly">Weekly</m3e-checkbox>',
        <Checkbox defaultSelected name="mail" value="weekly">
          Weekly
        </Checkbox>,
      ],
      [
        '<m3e-checkbox disabled invalid required label="Terms"></m3e-checkbox>',
        <Checkbox isDisabled isInvalid isRequired aria-label="Terms" />,
      ],
      [
        '<m3e-checkbox indeterminate>Parent</m3e-checkbox>',
        <Checkbox isIndeterminate>Parent</Checkbox>,
      ],
    ];
    for (const [html, ui] of cases) {
      const el = await renderElement(html);
      const container = await renderReact(ui);
      // React Aria's runtime marker is not part of the contract (as the other parity tests).
      const react = reactContract(container).replaceAll(' data-react-aria-pressable="true"', '');
      expect(react, html).toBe(elementContract(el));
    }
    expect(CHECKBOX_SEGMENT_PATH).toBe('M0 0H48');
  });

  it('wraps a native checkbox; isIndeterminate sets the property', async () => {
    const container = await renderReact(<Checkbox isIndeterminate>Parent</Checkbox>);
    const input = container.querySelector('input')!;
    expect(input.type).toBe('checkbox');
    expect(input.className).toBe('m3e-checkbox__input');
    expect(input.indeterminate).toBe(true);
    expect(container.querySelector('.m3e-checkbox__label')!.textContent).toBe('Parent');
  });

  it('toggles and calls onChange (uncontrolled and controlled)', async () => {
    const onChange = vi.fn();
    const container = await renderReact(<Checkbox onChange={onChange}>A</Checkbox>);
    const input = container.querySelector('input')!;
    await act(async () => {
      input.click();
      await Promise.resolve();
    });
    expect(onChange).toHaveBeenCalledWith(true);
    expect(input.checked).toBe(true);

    function Controlled() {
      const [on, setOn] = useState(false);
      return (
        <Checkbox isSelected={on} onChange={setOn}>
          B
        </Checkbox>
      );
    }
    const c2 = await renderReact(<Controlled />);
    const input2 = c2.querySelector('input')!;
    await act(async () => {
      input2.click();
      await Promise.resolve();
    });
    expect(input2.checked).toBe(true);
  });

  it('writes the previous state to data-from, as the element does', async () => {
    let set: ((v: { selected: boolean; indeterminate: boolean }) => void) | undefined;
    function Tri() {
      const [s, setS] = useState({ selected: false, indeterminate: false });
      set = setS;
      return (
        <Checkbox isSelected={s.selected} isIndeterminate={s.indeterminate}>
          Parent
        </Checkbox>
      );
    }
    const container = await renderReact(<Tri />);
    const root = container.querySelector('.m3e-checkbox')!;
    expect(root.hasAttribute('data-from')).toBe(false);
    const step = async (selected: boolean, indeterminate: boolean) => {
      await act(async () => {
        set?.({ selected, indeterminate });
        await flush();
      });
      return root.getAttribute('data-from');
    };
    expect(await step(false, true)).toBe('unchecked');
    expect(await step(true, false)).toBe('indeterminate');
    expect(await step(true, true)).toBe('checked');
    expect(await step(false, false)).toBe('indeterminate');
  });

  it('isInvalid and isRequired use aria attributes (React Aria validationBehavior "aria")', async () => {
    const container = await renderReact(
      <Checkbox isInvalid isRequired>
        Terms
      </Checkbox>,
    );
    const input = container.querySelector('input')!;
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-required')).toBe('true');
    expect(input.required).toBe(false);
  });

  it('drives the ripple on the state circle (Space presses; Enter does not)', async () => {
    const container = await renderReact(<Checkbox>Keys</Checkbox>);
    const input = container.querySelector('input')!;
    const state = container.querySelector('.m3e-checkbox__state')!;
    expect(state.hasAttribute('data-ripple')).toBe(true);
    input.focus();
    await act(async () => {
      input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
      await Promise.resolve();
    });
    expect(state.hasAttribute('data-pressed')).toBe(false);
    await act(async () => {
      input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: ' ' }));
      await Promise.resolve();
    });
    expect(state.hasAttribute('data-pressed')).toBe(true);
    await act(async () => {
      input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: ' ' }));
      await Promise.resolve();
    });
    expect(state.hasAttribute('data-pressed')).toBe(false);
  });
});
