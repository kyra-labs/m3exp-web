import { afterEach, describe, expect, it, vi } from 'vitest';
import './index.js';
import type { M3eSlider } from './slider.js';
import {
  formatSliderValue,
  sliderClassName,
  sliderPointerFraction,
  sliderStyle,
} from '../slider-layout/slider-layout.js';

const flush = async () => {
  for (let i = 0; i < 3; i++) await Promise.resolve();
};

const mount = async (html: string) => {
  document.body.innerHTML = html;
  await flush();
  return document.body.firstElementChild as M3eSlider;
};

const key = (target: Element, k: string, init: KeyboardEventInit = {}) => {
  target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, ...init }));
  target.dispatchEvent(new KeyboardEvent('keyup', { key: k, bubbles: true, ...init }));
};

/** A 400 × 48 track at (0, 0) (happy-dom has no layout). */
const stubTrack = (el: M3eSlider) => {
  const track = el.querySelector<HTMLElement>('.m3e-slider__track')!;
  track.getBoundingClientRect = () =>
    ({ left: 0, top: 0, right: 400, bottom: 48, width: 400, height: 48, x: 0, y: 0 }) as DOMRect;
  track.setPointerCapture = () => undefined;
  return track;
};

const pointer = (target: Element, type: string, clientX: number, clientY = 24) =>
  target.dispatchEvent(
    new PointerEvent(type, { bubbles: true, clientX, clientY, pointerId: 1, button: 0 }),
  );

describe('<m3e-slider>', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('renders the m3e-css contract: parts, ticks, a thumb with its native input', async () => {
    const el = await mount(
      '<m3e-slider label="Volume" min="0" max="100" step="25" value="50" name="volume"></m3e-slider>',
    );
    expect(el.style.display).toBe('contents');
    const root = el.sliderElement!;
    expect(root.className).toBe('m3e-slider');
    expect(root.getAttribute('role')).toBe('group');
    expect(root.getAttribute('aria-label')).toBe('Volume');
    expect(root.style.getPropertyValue('--m3e-comp-slider-value')).toBe('0.5');
    expect(root.style.getPropertyValue('--m3e-comp-slider-steps')).toBe('3');
    const track = root.firstElementChild!;
    expect(track.className).toBe('m3e-slider__track');
    expect([...track.children].map((c) => c.className)).toEqual([
      'm3e-slider__inactive-start',
      'm3e-slider__active',
      'm3e-slider__inactive-end',
      'm3e-slider__ticks',
      'm3e-slider__thumb',
    ]);
    expect(track.querySelectorAll('.m3e-slider__tick')).toHaveLength(5);
    const input = el.inputs[0]!;
    expect(input.type).toBe('range');
    expect(input.getAttribute('min')).toBe('0');
    expect(input.getAttribute('max')).toBe('100');
    expect(input.getAttribute('step')).toBe('25');
    expect(input.value).toBe('50');
    expect(input.getAttribute('aria-valuetext')).toBe('50');
    expect(input.getAttribute('aria-orientation')).toBe('horizontal');
    expect(input.getAttribute('aria-labelledby')).toBe(root.id);
    expect(input.name).toBe('volume');
    expect(input.tabIndex).toBe(0);
    expect(track.querySelector('.m3e-slider__value-indicator')!.textContent).toBe('50');
  });

  it('keyboard steps equal `step`; PageUp / Home / End; change on key up', async () => {
    const el = await mount('<m3e-slider label="L" max="100" step="10" value="40"></m3e-slider>');
    const input = el.inputs[0]!;
    const onInput = vi.fn();
    const onChange = vi.fn();
    el.addEventListener('input', onInput);
    el.addEventListener('change', onChange);
    key(input, 'ArrowRight');
    expect(el.values).toEqual([50]);
    expect(onInput).toHaveBeenLastCalledWith(expect.objectContaining({ detail: { value: 50 } }));
    expect(onChange).toHaveBeenCalledTimes(1);
    key(input, 'ArrowLeft');
    key(input, 'ArrowDown');
    expect(el.values).toEqual([30]);
    key(input, 'PageUp'); // clamp(10 / 10, 1, 10) = 1 step
    expect(el.values).toEqual([40]);
    key(input, 'End');
    expect(el.values).toEqual([100]);
    key(input, 'ArrowRight');
    expect(el.values).toEqual([100]);
    key(input, 'Home');
    expect(el.values).toEqual([0]);
    expect(input.getAttribute('aria-valuetext')).toBe('0');
  });

  it('continuous: a key moves 1 % of the range, a page 10 %', async () => {
    const el = await mount('<m3e-slider label="L" value="0.5"></m3e-slider>');
    const input = el.inputs[0]!;
    expect(input.getAttribute('step')).toBe('0.01');
    key(input, 'ArrowUp');
    expect(el.values[0]).toBeCloseTo(0.51, 10);
    key(input, 'ArrowRight', { shiftKey: true });
    expect(el.values[0]).toBeCloseTo(0.61, 10);
    key(input, 'PageDown');
    expect(el.values[0]).toBeCloseTo(0.51, 10);
  });

  it('RTL mirrors the horizontal arrows; a vertical slider increases upwards', async () => {
    document.documentElement.style.direction = 'rtl';
    try {
      const el = await mount('<m3e-slider label="L" max="10" step="1" value="5"></m3e-slider>');
      key(el.inputs[0]!, 'ArrowRight');
      expect(el.values).toEqual([4]);
    } finally {
      document.documentElement.style.direction = '';
    }
    const v = await mount(
      '<m3e-slider label="L" vertical max="10" step="1" value="5"></m3e-slider>',
    );
    expect(v.sliderElement!.className).toBe('m3e-slider m3e-slider--vertical');
    expect(v.inputs[0]!.getAttribute('aria-orientation')).toBe('vertical');
    key(v.inputs[0]!, 'ArrowUp');
    expect(v.values).toEqual([6]);
  });

  it('range: two labelled thumbs that cannot cross', async () => {
    const el = await mount(
      '<m3e-slider label="Price" range max="100" step="10" start-value="20" end-value="60"></m3e-slider>',
    );
    const root = el.sliderElement!;
    expect(root.className).toBe('m3e-slider m3e-slider--range');
    expect(root.style.getPropertyValue('--m3e-comp-slider-start-value')).toBe('0.2');
    expect(root.style.getPropertyValue('--m3e-comp-slider-value')).toBe('0.6');
    const [start, end] = el.inputs;
    expect(start!.parentElement!.className).toBe('m3e-slider__thumb m3e-slider__thumb--start');
    expect(start!.getAttribute('aria-label')).toBe('Range start');
    expect(end!.getAttribute('aria-label')).toBe('Range end');
    expect(start!.getAttribute('aria-labelledby')).toBe(`${start!.id} ${root.id}`);
    expect(start!.getAttribute('max')).toBe('60');
    expect(end!.getAttribute('min')).toBe('20');
    const onInput = vi.fn();
    el.addEventListener('input', onInput);
    key(start!, 'End');
    expect(el.values).toEqual([60, 60]);
    expect(onInput).toHaveBeenLastCalledWith(
      expect.objectContaining({ detail: { start: 60, end: 60 } }),
    );
    key(start!, 'ArrowRight');
    expect(el.values).toEqual([60, 60]);
    key(end!, 'ArrowLeft');
    expect(el.values).toEqual([60, 60]);
    key(end!, 'ArrowRight');
    expect(el.values).toEqual([60, 70]);
  });

  it('pointer: a press moves the closer thumb, drags it with snapping, and ends with change', async () => {
    const el = await mount(
      '<m3e-slider label="Price" range max="100" step="10" start-value="20" end-value="60"></m3e-slider>',
    );
    const track = stubTrack(el);
    const onChange = vi.fn();
    el.addEventListener('change', onChange);
    pointer(track, 'pointerdown', 120); // 30: the start thumb (20) is closer
    expect(el.values).toEqual([30, 60]);
    const thumb = el.inputs[0]!.parentElement!;
    expect(thumb.hasAttribute('data-dragging')).toBe(true);
    pointer(track, 'pointermove', 300); // 75: stops at the end thumb
    expect(el.values).toEqual([60, 60]);
    pointer(track, 'pointerup', 300);
    expect(thumb.hasAttribute('data-dragging')).toBe(false);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect((onChange.mock.calls[0]![0] as CustomEvent).detail).toEqual({ start: 60, end: 60 });
  });

  it('disabled: no tab stop, no pointer or key changes', async () => {
    const el = await mount('<m3e-slider label="L" disabled value="0.3"></m3e-slider>');
    const input = el.inputs[0]!;
    expect(input.disabled).toBe(true);
    expect(input.hasAttribute('tabindex')).toBe(false);
    key(input, 'ArrowRight');
    pointer(stubTrack(el), 'pointerdown', 380);
    expect(el.values).toEqual([0.3]);
  });

  it('sizes, centered and the inset icon', async () => {
    const el = await mount('<m3e-slider label="L" size="m" icon="volume_up"></m3e-slider>');
    expect(el.sliderElement!.className).toBe('m3e-slider m3e-slider--size-m');
    const icons = el.querySelectorAll('.m3e-slider__icon');
    expect(
      [...icons].map((i) => [i.className, i.textContent, i.getAttribute('aria-hidden')]),
    ).toEqual([
      ['m3e-icon m3e-slider__icon', 'volume_up', 'true'],
      ['m3e-icon m3e-slider__icon m3e-slider__icon--inactive', 'volume_up', 'true'],
    ]);
    const c = await mount('<m3e-slider label="L" centered min="-50" max="50"></m3e-slider>');
    expect(c.sliderElement!.className).toBe('m3e-slider m3e-slider--centered');
    expect(c.values).toEqual([-50]);
  });

  it('a value set on the input (assistive technology) is taken and re-emitted', async () => {
    const el = await mount('<m3e-slider label="L" max="10" step="1" value="2"></m3e-slider>');
    const outer = vi.fn();
    el.parentElement!.addEventListener('input', outer);
    const input = el.inputs[0]!;
    input.value = '7';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(el.values).toEqual([7]);
    expect(outer).toHaveBeenCalledTimes(1);
    expect(outer.mock.calls[0]![0]).toBeInstanceOf(CustomEvent);
  });
});

describe('slider-layout', () => {
  it('class names and custom properties', () => {
    expect(sliderClassName({})).toBe('m3e-slider');
    expect(sliderClassName({ size: 'xl', centered: true, vertical: true })).toBe(
      'm3e-slider m3e-slider--size-xl m3e-slider--centered m3e-slider--vertical',
    );
    expect(sliderStyle([25], { min: 0, max: 100 })).toEqual({ '--m3e-comp-slider-value': '0.25' });
    expect(sliderStyle([20, 60], { min: 0, max: 100, step: 10 })).toEqual({
      '--m3e-comp-slider-value': '0.6',
      '--m3e-comp-slider-start-value': '0.2',
      '--m3e-comp-slider-steps': '9',
    });
  });

  it('value text: at most two fraction digits (Compose formatForSemantics)', () => {
    expect(formatSliderValue(0.3456, 'en-US')).toBe('0.35');
    expect(formatSliderValue(1000, 'de-DE')).toBe('1.000');
  });

  it('pointer fraction: mirrored in RTL, from the bottom when vertical', () => {
    const rect = { left: 100, top: 0, right: 300, bottom: 200, width: 200, height: 200 } as DOMRect;
    expect(sliderPointerFraction(rect, 150, 0, false, false)).toBe(0.25);
    expect(sliderPointerFraction(rect, 150, 0, false, true)).toBe(0.75);
    expect(sliderPointerFraction(rect, 0, 150, true, false)).toBe(0.25);
    expect(sliderPointerFraction(rect, 50, 0, false, false)).toBe(0);
  });
});
