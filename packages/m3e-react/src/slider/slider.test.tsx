import '@kyralabs/m3e-elements/slider.js';
import { act, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { canonical, renderElement, renderReact } from '../test/parity.js';
import { RangeSlider, Slider } from './index.js';

afterEach(() => {
  document.body.replaceChildren();
});

/**
 * The contract without ids (React Aria's useId vs the element's counter) and the labelledby lists
 * that reference them; React Aria's runtime markers are not part of it.
 */
const contract = (root: Element) => {
  const clone = root.cloneNode(true) as Element;
  for (const node of [clone, ...clone.querySelectorAll('*')]) {
    for (const name of ['id', 'aria-labelledby', 'data-react-aria-pressable']) {
      node.removeAttribute(name);
    }
  }
  return canonical(clone);
};

const keyDown = async (target: Element, key: string, init: KeyboardEventInit = {}) => {
  await act(async () => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...init }));
    target.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true, ...init }));
    await Promise.resolve();
  });
};

describe('element / React DOM parity (CLAUDE.md "Done means" #8)', () => {
  const cases: [string, React.ReactNode][] = [
    [
      '<m3e-slider label="Volume" value="0.4"></m3e-slider>',
      <Slider aria-label="Volume" defaultValue={0.4} />,
    ],
    [
      '<m3e-slider label="Steps" min="0" max="100" step="25" value="50" name="n" size="m" icon="volume_up"></m3e-slider>',
      <Slider
        aria-label="Steps"
        minValue={0}
        maxValue={100}
        step={25}
        defaultValue={50}
        name="n"
        size="m"
        icon="volume_up"
      />,
    ],
    [
      '<m3e-slider label="Balance" centered min="-50" max="50" step="10" value="20"></m3e-slider>',
      <Slider
        aria-label="Balance"
        variant="centered"
        minValue={-50}
        maxValue={50}
        step={10}
        defaultValue={20}
      />,
    ],
    [
      '<m3e-slider label="Light" vertical disabled value="0.3" size="xl"></m3e-slider>',
      <Slider aria-label="Light" orientation="vertical" isDisabled defaultValue={0.3} size="xl" />,
    ],
    [
      '<m3e-slider label="Price" range max="100" step="10" start-value="20" end-value="60"></m3e-slider>',
      <RangeSlider aria-label="Price" maxValue={100} step={10} defaultValue={[20, 60]} />,
    ],
  ];

  it.each(cases)('%s', async (html, ui) => {
    const host = await renderElement(html);
    const react = await renderReact(ui);
    expect(contract(react.querySelector('.m3e-slider')!)).toBe(
      contract(host.querySelector('.m3e-slider')!),
    );
  });

  it('labels each input by the group (a range thumb by itself first), as the element', async () => {
    const react = await renderReact(<RangeSlider aria-label="Price" defaultValue={[0.2, 0.6]} />);
    const host = await renderElement(
      '<m3e-slider label="Price" range start-value="0.2" end-value="0.6"></m3e-slider>',
    );
    for (const container of [react, host]) {
      const root = container.querySelector('.m3e-slider')!;
      const [start, end] = container.querySelectorAll('input');
      expect(start!.getAttribute('aria-labelledby')).toBe(`${start!.id} ${root.id}`);
      expect(end!.getAttribute('aria-label')).toBe('Range end');
      expect(start!.id).toBe(`${root.id}-0`);
    }
  });
});

describe('<Slider>', () => {
  it('keyboard steps equal `step`; onChangeEnd on key up', async () => {
    const onChange = vi.fn();
    const onChangeEnd = vi.fn();
    const container = await renderReact(
      <Slider
        aria-label="L"
        maxValue={100}
        step={10}
        defaultValue={40}
        onChange={onChange}
        onChangeEnd={onChangeEnd}
      />,
    );
    const input = container.querySelector('input')!;
    await keyDown(input, 'ArrowRight');
    expect(onChange).toHaveBeenLastCalledWith(50);
    expect(onChangeEnd).toHaveBeenLastCalledWith(50);
    await keyDown(input, 'PageDown');
    expect(onChange).toHaveBeenLastCalledWith(40);
    await keyDown(input, 'End');
    expect(onChange).toHaveBeenLastCalledWith(100);
    await keyDown(input, 'Home');
    expect(onChange).toHaveBeenLastCalledWith(0);
    expect(input.getAttribute('aria-valuetext')).toBe('0');
    const root = container.querySelector<HTMLElement>('.m3e-slider')!;
    expect(root.style.getPropertyValue('--m3e-comp-slider-value')).toBe('0');
    expect(container.querySelector('.m3e-slider__value-indicator')!.textContent).toBe('0');
  });

  it('continuous: 1 % per key; vertical increases upwards', async () => {
    const onChange = vi.fn();
    const container = await renderReact(
      <Slider aria-label="L" orientation="vertical" defaultValue={0.5} onChange={onChange} />,
    );
    const input = container.querySelector('input')!;
    expect(input.getAttribute('aria-orientation')).toBe('vertical');
    expect(input.getAttribute('step')).toBe('0.01');
    await keyDown(input, 'ArrowUp');
    expect(onChange.mock.lastCall![0]).toBeCloseTo(0.51, 10);
    await keyDown(input, 'ArrowDown', { shiftKey: true });
    expect(onChange.mock.lastCall![0]).toBeCloseTo(0.41, 10);
  });

  it('controlled', async () => {
    function Controlled() {
      const [v, setV] = useState(2);
      return (
        <>
          <Slider aria-label="L" maxValue={10} step={1} value={v} onChange={setV} />
          <output>{v}</output>
        </>
      );
    }
    const container = await renderReact(<Controlled />);
    await keyDown(container.querySelector('input')!, 'ArrowRight');
    expect(container.querySelector('output')!.textContent).toBe('3');
  });

  it('disabled: no tab stop and no key changes', async () => {
    const onChange = vi.fn();
    const container = await renderReact(<Slider aria-label="L" isDisabled onChange={onChange} />);
    const input = container.querySelector('input')!;
    expect(input.disabled).toBe(true);
    expect(input.hasAttribute('tabindex')).toBe(false);
    await keyDown(input, 'ArrowRight');
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('<RangeSlider>', () => {
  it('range thumbs cannot cross', async () => {
    const onChange = vi.fn();
    const container = await renderReact(
      <RangeSlider
        aria-label="Price"
        maxValue={100}
        step={10}
        defaultValue={[20, 60]}
        onChange={onChange}
      />,
    );
    const [start, end] = container.querySelectorAll('input');
    expect(start!.getAttribute('max')).toBe('60');
    expect(end!.getAttribute('min')).toBe('20');
    await keyDown(start!, 'End');
    expect(onChange).toHaveBeenLastCalledWith([60, 60]);
    onChange.mockClear();
    await keyDown(start!, 'ArrowRight');
    await keyDown(end!, 'ArrowLeft');
    expect(onChange).not.toHaveBeenCalled();
    await keyDown(end!, 'ArrowRight');
    expect(onChange).toHaveBeenLastCalledWith([60, 70]);
  });

  it('custom thumb labels', async () => {
    const container = await renderReact(
      <RangeSlider aria-label="Hours" thumbLabels={['From', 'To']} />,
    );
    expect(
      [...container.querySelectorAll('input')].map((i) => i.getAttribute('aria-label')),
    ).toEqual(['From', 'To']);
  });
});
