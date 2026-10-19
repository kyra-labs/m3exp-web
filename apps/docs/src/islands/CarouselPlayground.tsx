import {
  Button,
  Carousel,
  type CarouselHandle,
  CarouselItem,
  type CarouselLayoutType,
} from '@kyralabs/m3exp-web/react';
import { useRef, useState } from 'react';

const TONES = ['primary', 'secondary', 'tertiary', 'error'];
const LAYOUTS: readonly CarouselLayoutType[] = [
  'multi-browse',
  'uncontained',
  'hero',
  'centered-hero',
];

/** React carousel: the layout, a button item that reports presses and scrollToItem. */
export default function CarouselPlayground() {
  const [layout, setLayout] = useState<CarouselLayoutType>('multi-browse');
  const [last, setLast] = useState('none');
  const ref = useRef<CarouselHandle>(null);
  return (
    <div data-testid="react-carousel">
      <div className="docs-button-row">
        <label>
          Layout{' '}
          <select
            value={layout}
            onChange={(e) => {
              setLayout(e.target.value as CarouselLayoutType);
            }}
            data-testid="react-layout"
          >
            {LAYOUTS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <Button
          variant="tonal"
          onPress={() => {
            ref.current?.scrollToItem(5);
          }}
          data-testid="react-scroll"
        >
          Scroll to 6
        </Button>
        <span>
          Last press: <output data-testid="react-last">{last}</output>
        </span>
      </div>
      <div className="docs-carousel-frame">
        <Carousel
          ref={ref}
          layout={layout}
          itemWidth={layout === 'hero' || layout === 'centered-hero' ? undefined : 186}
          itemSpacing={8}
          contentPadding={16}
          aria-label="React carousel"
        >
          {Array.from({ length: 8 }, (_, i) => (
            <CarouselItem
              key={i}
              onPress={() => {
                setLast(String(i + 1));
              }}
            >
              <div className="docs-carousel-tile" data-tone={TONES[i % TONES.length]}>
                <span className="docs-carousel-tile__label">{i + 1}</span>
              </div>
            </CarouselItem>
          ))}
        </Carousel>
      </div>
    </div>
  );
}
