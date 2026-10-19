/* eslint-disable @typescript-eslint/no-deprecated -- the D4 segmented button is tested here */
import { act, createRef, useState } from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { Icon } from '../icon/Icon.js';
import { renderReact } from '../test/parity.js';
import {
  MultiChoiceSegmentedButtonRow,
  SegmentedButton,
  SingleChoiceSegmentedButtonRow,
} from './index.js';

// warnDeprecated warns once per page load: collect every warning from the start.
const warn = vi.spyOn(console, 'warn');
beforeAll(() => {
  warn.mockImplementation(() => undefined);
});
afterAll(() => {
  warn.mockRestore();
});
afterEach(() => {
  document.body.replaceChildren();
});

const OPTIONS = ['Day', 'Month', 'Week'];

const key = async (target: Element, type: 'keydown' | 'keyup', k: string) => {
  await act(async () => {
    target.dispatchEvent(new KeyboardEvent(type, { bubbles: true, cancelable: true, key: k }));
    await Promise.resolve();
  });
};
const click = async (el: HTMLElement) => {
  await act(async () => {
    el.click();
    await Promise.resolve();
  });
};

const single = (props: Partial<Parameters<typeof SingleChoiceSegmentedButtonRow>[0]> = {}) => (
  <SingleChoiceSegmentedButtonRow aria-label="Range" name="range" defaultValue="Day" {...props}>
    {OPTIONS.map((o) => (
      <SegmentedButton key={o} value={o}>
        {o}
      </SegmentedButton>
    ))}
  </SingleChoiceSegmentedButtonRow>
);

describe('deprecation (D4)', () => {
  it('each row warns once in development, naming the connected button group', async () => {
    await renderReact(single());
    await renderReact(single());
    await renderReact(
      <MultiChoiceSegmentedButtonRow aria-label="Filters">
        <SegmentedButton value="a">A</SegmentedButton>
      </MultiChoiceSegmentedButtonRow>,
    );
    await renderReact(
      <MultiChoiceSegmentedButtonRow aria-label="Filters">
        <SegmentedButton value="b">B</SegmentedButton>
      </MultiChoiceSegmentedButtonRow>,
    );
    const messages = warn.mock.calls.map((c) => String(c[0]));
    expect(messages).toHaveLength(2);
    expect(messages[0]).toContain('<SingleChoiceSegmentedButtonRow> is deprecated (DECISIONS D4)');
    expect(messages[0]).toContain('<ButtonGroup variant="connected" selectionMode="single">');
    expect(messages[1]).toContain('<MultiChoiceSegmentedButtonRow> is deprecated (DECISIONS D4)');
    expect(messages[1]).toContain('selectionMode="multiple"');
  });

  it('a segmented button outside a row throws', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(renderReact(<SegmentedButton value="x">X</SegmentedButton>)).rejects.toThrow(
      /must be inside a <SingleChoiceSegmentedButtonRow> or <MultiChoiceSegmentedButtonRow>/,
    );
    error.mockRestore();
  });
});

describe('the m3e-css contract (segmented-button.css header)', () => {
  // Tags, classes, roles, types and the decorative markers: React Aria adds ids, names and
  // ARIA wiring, which the header leaves to the author.
  const skeleton = (node: Element): string => {
    const keep = ['class', 'role', 'type', 'aria-hidden', 'data-fill'];
    const attrs = keep
      .filter((a) => node.hasAttribute(a))
      .map((a) => ` ${a}="${node.getAttribute(a)!}"`)
      .join('');
    const tag = node.tagName.toLowerCase();
    const inner = [...node.childNodes]
      .map((c) => (c.nodeType === Node.TEXT_NODE ? (c.textContent ?? '') : skeleton(c as Element)))
      .join('');
    return `<${tag}${attrs}>${inner}</${tag}>`;
  };
  const documented = (html: string) => {
    const div = document.createElement('div');
    div.innerHTML = html.replace(/>\s+</g, '><').trim();
    return skeleton(div.firstElementChild!);
  };

  it('single choice: a radiogroup of labels around native radios, the check slot and the label', async () => {
    const container = await renderReact(single());
    const row = container.firstElementChild!;
    expect(skeleton(row)).toBe(
      documented(`<div class="m3e-segmented-button-row" role="radiogroup">
        ${OPTIONS.map(
          (o) => `<label class="m3e-segmented-button">
            <input class="m3e-segmented-button__input" type="radio">
            <span class="m3e-segmented-button__icon" aria-hidden="true">
              <span class="m3e-icon m3e-segmented-button__check" data-fill="" aria-hidden="true">check</span>
            </span>
            <span class="m3e-segmented-button__label">${o}</span>
          </label>`,
        ).join('')}
      </div>`),
    );
    expect(row.getAttribute('aria-label')).toBe('Range');
    expect(row.getAttribute('aria-orientation')).toBe('horizontal');
    const inputs = [...row.querySelectorAll('input')];
    expect(inputs.map((i) => [i.name, i.value, i.checked])).toEqual([
      ['range', 'Day', true],
      ['range', 'Month', false],
      ['range', 'Week', false],
    ]);
    // Roving tab stop: only the selected radio is tabbable.
    expect(inputs.map((i) => i.tabIndex)).toEqual([0, -1, -1]);
    // The label names each radio (the check slot is aria-hidden).
    const label = inputs[1]!.labels![0]!;
    expect(label.querySelector('.m3e-segmented-button__label')!.textContent).toBe('Month');
    expect(label.querySelector('.m3e-segmented-button__icon')!.getAttribute('aria-hidden')).toBe(
      'true',
    );
    // React drives the ripple (m3e-elements' auto ripple skips the button).
    expect(row.querySelector('label')!.hasAttribute('data-ripple')).toBe(true);
  });

  it('multiple choice: a group of native checkboxes; an unselected icon follows the check', async () => {
    const container = await renderReact(
      <MultiChoiceSegmentedButtonRow aria-label="Filters" defaultValue={['Trending']}>
        <SegmentedButton value="Favorites" icon={<Icon name="star" />}>
          Favorites
        </SegmentedButton>
        <SegmentedButton value="Trending" icon={<Icon name="trending_up" />}>
          Trending
        </SegmentedButton>
      </MultiChoiceSegmentedButtonRow>,
    );
    const row = container.firstElementChild!;
    expect(skeleton(row)).toBe(
      documented(`<div class="m3e-segmented-button-row" role="group">
        <label class="m3e-segmented-button">
          <input class="m3e-segmented-button__input" type="checkbox">
          <span class="m3e-segmented-button__icon" aria-hidden="true">
            <span class="m3e-icon m3e-segmented-button__check" data-fill="" aria-hidden="true">check</span>
            <span class="m3e-icon" aria-hidden="true">star</span>
          </span>
          <span class="m3e-segmented-button__label">Favorites</span>
        </label>
        <label class="m3e-segmented-button">
          <input class="m3e-segmented-button__input" type="checkbox">
          <span class="m3e-segmented-button__icon" aria-hidden="true">
            <span class="m3e-icon m3e-segmented-button__check" data-fill="" aria-hidden="true">check</span>
            <span class="m3e-icon" aria-hidden="true">trending_up</span>
          </span>
          <span class="m3e-segmented-button__label">Trending</span>
        </label>
      </div>`),
    );
    expect(row.getAttribute('aria-label')).toBe('Filters');
    const inputs = [...row.querySelectorAll('input')];
    expect(inputs.map((i) => [i.value, i.checked, i.tabIndex])).toEqual([
      ['Favorites', false, 0],
      ['Trending', true, 0],
    ]);
  });
});

describe('<SingleChoiceSegmentedButtonRow>', () => {
  it('selects on click; onChange; controlled', async () => {
    const onChange = vi.fn();
    const container = await renderReact(single({ onChange }));
    const [, month] = [...container.querySelectorAll('input')];
    await click(month!);
    expect(onChange).toHaveBeenCalledWith('Month');
    expect(month!.checked).toBe(true);

    function Controlled() {
      const [value, setValue] = useState('Week');
      return single({ value, onChange: setValue });
    }
    const c2 = await renderReact(<Controlled />);
    const inputs = [...c2.querySelectorAll('input')];
    expect(inputs[2]!.checked).toBe(true);
    await click(inputs[0]!.closest('label')!.querySelector('.m3e-segmented-button__label')!);
    expect(inputs[0]!.checked).toBe(true);
    expect(inputs[2]!.checked).toBe(false);
  });

  it('arrow keys move the selection and wrap; Enter does not select (native radios)', async () => {
    const onChange = vi.fn();
    const container = await renderReact(single({ onChange }));
    const [day, month, week] = [...container.querySelectorAll('input')];
    day!.focus();
    await key(day!, 'keydown', 'ArrowRight');
    expect(onChange).toHaveBeenLastCalledWith('Month');
    expect(document.activeElement).toBe(month);
    await key(month!, 'keydown', 'ArrowRight');
    await key(week!, 'keydown', 'ArrowRight');
    expect(onChange).toHaveBeenLastCalledWith('Day');
    expect(document.activeElement).toBe(day);
    await key(day!, 'keydown', 'ArrowLeft');
    expect(onChange).toHaveBeenLastCalledWith('Week');
    onChange.mockClear();
    await key(week!, 'keydown', 'Enter');
    await key(week!, 'keyup', 'Enter');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('isDisabled disables every button; a disabled button is skipped', async () => {
    const container = await renderReact(single({ isDisabled: true }));
    expect([...container.querySelectorAll('input')].every((i) => i.disabled)).toBe(true);
    expect(container.firstElementChild!.getAttribute('aria-disabled')).toBe('true');

    const onChange = vi.fn();
    const c2 = await renderReact(
      <SingleChoiceSegmentedButtonRow aria-label="R" defaultValue="a" onChange={onChange}>
        <SegmentedButton value="a">A</SegmentedButton>
        <SegmentedButton value="b" isDisabled>
          B
        </SegmentedButton>
        <SegmentedButton value="c">C</SegmentedButton>
      </SingleChoiceSegmentedButtonRow>,
    );
    const [a, b] = [...c2.querySelectorAll('input')];
    expect(b!.disabled).toBe(true);
    a!.focus();
    await key(a!, 'keydown', 'ArrowRight');
    expect(onChange).toHaveBeenLastCalledWith('c');
  });

  it('forwards the input ref; className reaches the row and the button', async () => {
    const input = createRef<HTMLInputElement>();
    const row = createRef<HTMLDivElement>();
    const container = await renderReact(
      <SingleChoiceSegmentedButtonRow ref={row} className="extra" aria-label="R">
        <SegmentedButton ref={input} className="mine" value="a">
          A
        </SegmentedButton>
      </SingleChoiceSegmentedButtonRow>,
    );
    expect(row.current).toBe(container.firstElementChild);
    expect(row.current!.className).toBe('m3e-segmented-button-row extra');
    expect(input.current).toBe(container.querySelector('input'));
    expect(input.current!.closest('label')!.className).toBe('m3e-segmented-button mine');
  });
});

describe('<MultiChoiceSegmentedButtonRow>', () => {
  it('toggles values on click and Space; onChange gets the checked values; controlled', async () => {
    const onChange = vi.fn();
    const container = await renderReact(
      <MultiChoiceSegmentedButtonRow aria-label="F" onChange={onChange}>
        <SegmentedButton value="a">A</SegmentedButton>
        <SegmentedButton value="b">B</SegmentedButton>
      </MultiChoiceSegmentedButtonRow>,
    );
    const [a, b] = [...container.querySelectorAll('input')];
    await click(a!);
    expect(onChange).toHaveBeenLastCalledWith(['a']);
    await click(b!);
    expect(onChange).toHaveBeenLastCalledWith(['a', 'b']);
    await click(a!);
    expect(onChange).toHaveBeenLastCalledWith(['b']);
    expect([a!.checked, b!.checked]).toEqual([false, true]);

    function Controlled() {
      const [value, setValue] = useState<string[]>(['y']);
      return (
        <MultiChoiceSegmentedButtonRow aria-label="C" value={value} onChange={setValue}>
          <SegmentedButton value="x">X</SegmentedButton>
          <SegmentedButton value="y">Y</SegmentedButton>
        </MultiChoiceSegmentedButtonRow>
      );
    }
    const c2 = await renderReact(<Controlled />);
    const [x, y] = [...c2.querySelectorAll('input')];
    expect([x!.checked, y!.checked]).toEqual([false, true]);
    await click(x!);
    expect([x!.checked, y!.checked]).toEqual([true, true]);
  });

  it('isDisabled reaches every checkbox', async () => {
    const container = await renderReact(
      <MultiChoiceSegmentedButtonRow aria-label="F" isDisabled>
        <SegmentedButton value="a">A</SegmentedButton>
        <SegmentedButton value="b">B</SegmentedButton>
      </MultiChoiceSegmentedButtonRow>,
    );
    expect([...container.querySelectorAll('input')].every((i) => i.disabled)).toBe(true);
  });
});
