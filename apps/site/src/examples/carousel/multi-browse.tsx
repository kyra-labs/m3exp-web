import { Carousel, CarouselItem, Icon } from '@kyralabs/m3exp-web/react';

const ITEMS = [
  { icon: 'landscape', label: 'Mountains', color: 'primary' },
  { icon: 'forest', label: 'Forest', color: 'secondary' },
  { icon: 'beach_access', label: 'Beach', color: 'tertiary' },
  { icon: 'sailing', label: 'Sailing', color: 'primary' },
  { icon: 'hiking', label: 'Hiking', color: 'secondary' },
  { icon: 'kayaking', label: 'Kayaking', color: 'tertiary' },
];

/** About 200px, from spacing tokens. */
const TILE_HEIGHT =
  'calc(var(--m3e-sys-space-900) + var(--m3e-sys-space-900) + var(--m3e-sys-space-800))';

export default function MultiBrowse() {
  return (
    <Carousel aria-label="Trips" itemWidth={186} itemSpacing={8} style={{ inlineSize: '100%' }}>
      {ITEMS.map((item, i) => (
        <CarouselItem
          key={i}
          onPress={() => {
            console.log(i);
          }}
        >
          <div
            style={{
              display: 'grid',
              placeItems: 'center',
              alignContent: 'center',
              blockSize: TILE_HEIGHT,
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
