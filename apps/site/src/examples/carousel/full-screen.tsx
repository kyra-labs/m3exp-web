import { Carousel, CarouselItem, Icon } from '@kyralabs/m3exp-web/react';

const ITEMS = [
  { icon: 'landscape', label: 'Mountains', color: 'primary' },
  { icon: 'forest', label: 'Forest', color: 'secondary' },
  { icon: 'beach_access', label: 'Beach', color: 'tertiary' },
  { icon: 'sailing', label: 'Sailing', color: 'primary' },
];

/** The carousel needs a height: about 420px, from spacing tokens. */
const HEIGHT =
  'calc(var(--m3e-sys-space-900) + var(--m3e-sys-space-900) + var(--m3e-sys-space-900) + var(--m3e-sys-space-900) + var(--m3e-sys-space-800) + var(--m3e-sys-space-800))';

export default function FullScreen() {
  return (
    <Carousel
      aria-label="Stories"
      layout="full-screen"
      style={{ inlineSize: '100%', blockSize: HEIGHT }}
    >
      {ITEMS.map((item) => (
        <CarouselItem key={item.label}>
          <div
            style={{
              display: 'grid',
              placeItems: 'center',
              alignContent: 'center',
              blockSize: '100%',
              backgroundColor: `var(--m3e-sys-color-${item.color}-container)`,
              color: `var(--m3e-sys-color-on-${item.color}-container)`,
            }}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </div>
        </CarouselItem>
      ))}
    </Carousel>
  );
}
