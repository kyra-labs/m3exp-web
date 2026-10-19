import '@kyralabs/m3e-elements/carousel.js';
import { act, createRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { canonical, renderElement, renderReact } from '../test/parity.js';
import { Carousel, type CarouselHandle, CarouselItem } from './index.js';

/** happy-dom lays nothing out: every carousel is 412px wide. */
class FakeResizeObserver {
  constructor(private readonly cb: ResizeObserverCallback) {}
  observe(target: Element): void {
    this.cb(
      [
        {
          target,
          contentBoxSize: [{ inlineSize: 412, blockSize: 221 }],
          contentRect: { width: 412, height: 221 },
        } as unknown as ResizeObserverEntry,
      ],
      this,
    );
  }
  unobserve = vi.fn();
  disconnect = vi.fn();
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', FakeResizeObserver);
  vi.stubGlobal('requestAnimationFrame', () => 0);
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

describe('<Carousel>', () => {
  it('renders the APG carousel and runs the keyline layout', async () => {
    const container = await renderReact(
      <Carousel aria-label="Featured" itemWidth={186} itemSpacing={8} contentPadding={16}>
        <CarouselItem>
          <span>One</span>
        </CarouselItem>
        <CarouselItem href="/two">Two</CarouselItem>
        <CarouselItem onPress={vi.fn()} aria-label="Third">
          Three
        </CarouselItem>
      </Carousel>,
    );
    const root = container.querySelector<HTMLElement>('.m3e-carousel')!;
    expect(root.getAttribute('role')).toBe('region');
    expect(root.getAttribute('aria-label')).toBe('Featured');
    expect(root.hasAttribute('data-keylines')).toBe(true);
    const items = [...root.querySelectorAll('.m3e-carousel__item')];
    expect(items.map((i) => i.getAttribute('aria-label'))).toEqual(['1 of 3', '2 of 3', 'Third']);
    expect(items[0]!.getAttribute('tabindex')).toBe('0');
    expect(items[1]!.firstElementChild!.localName).toBe('a');
    expect(items[2]!.firstElementChild!.localName).toBe('button');
    expect(items[2]!.firstElementChild!.hasAttribute('data-ripple')).toBe(true);
  });

  it('onPress fires for button items; the ref scrolls', async () => {
    const onPress = vi.fn();
    const ref = createRef<CarouselHandle>();
    const container = await renderReact(
      <Carousel ref={ref} itemWidth={186}>
        <CarouselItem>One</CarouselItem>
        <CarouselItem onPress={onPress}>Two</CarouselItem>
      </Carousel>,
    );
    const button = container.querySelector('button')!;
    await act(async () => {
      button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
      button.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, button: 0 }));
      button.click();
      await Promise.resolve();
    });
    expect(onPress).toHaveBeenCalled();
    expect(ref.current?.element).toBe(container.querySelector('.m3e-carousel'));
    expect(ref.current?.currentItem).toBe(0);
  });
});

describe('<Carousel> ⇔ <m3e-carousel> DOM parity', () => {
  const same = async (html: string, ui: React.ReactElement) => {
    const host = await renderElement(html);
    // The element imports its layout on first render.
    await (host as HTMLElementTagNameMap['m3e-carousel']).ready;
    const element = canonical(host.querySelector('.m3e-carousel')!);
    document.body.innerHTML = '';
    const container = await renderReact(ui);
    // React Aria's runtime marker is not part of the contract (as in the other parity tests).
    const react = canonical(container.querySelector('.m3e-carousel')!).replaceAll(
      ' data-react-aria-pressable="true"',
      '',
    );
    expect(react, html).toBe(element);
  };

  it('multi-browse with static, link and button items', async () => {
    await same(
      '<m3e-carousel label="Featured" item-width="186" item-spacing="8" content-padding="16"><m3e-carousel-item><span>One</span></m3e-carousel-item><m3e-carousel-item href="/two">Two</m3e-carousel-item><m3e-carousel-item action label="Third">Three</m3e-carousel-item></m3e-carousel>',
      <Carousel aria-label="Featured" itemWidth={186} itemSpacing={8} contentPadding={16}>
        <CarouselItem>
          <span>One</span>
        </CarouselItem>
        <CarouselItem href="/two">Two</CarouselItem>
        <CarouselItem onPress={() => undefined} aria-label="Third">
          Three
        </CarouselItem>
      </Carousel>,
    );
  });

  it('centered hero and full screen', async () => {
    await same(
      '<m3e-carousel layout="centered-hero" label="Hero"><m3e-carousel-item>A</m3e-carousel-item><m3e-carousel-item>B</m3e-carousel-item><m3e-carousel-item>C</m3e-carousel-item></m3e-carousel>',
      <Carousel layout="centered-hero" aria-label="Hero">
        <CarouselItem>A</CarouselItem>
        <CarouselItem>B</CarouselItem>
        <CarouselItem>C</CarouselItem>
      </Carousel>,
    );
    await same(
      '<m3e-carousel layout="full-screen" label="Stories"><m3e-carousel-item>A</m3e-carousel-item><m3e-carousel-item>B</m3e-carousel-item></m3e-carousel>',
      <Carousel layout="full-screen" aria-label="Stories">
        <CarouselItem>A</CarouselItem>
        <CarouselItem>B</CarouselItem>
      </Carousel>,
    );
  });
});
