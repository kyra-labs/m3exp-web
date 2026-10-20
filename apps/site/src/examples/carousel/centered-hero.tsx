import { Carousel, CarouselItem, Icon } from '@kyralabs/m3exp-web/react';

const ICONS = ['photo_camera', 'palette', 'music_note', 'movie', 'menu_book'];

/** About 200px, from spacing tokens. */
const TILE_HEIGHT =
  'calc(var(--m3e-sys-space-900) + var(--m3e-sys-space-900) + var(--m3e-sys-space-800))';

export default function CenteredHero() {
  return (
    <Carousel
      aria-label="Collections"
      layout="centered-hero"
      itemSpacing={8}
      style={{ inlineSize: '100%' }}
    >
      {ICONS.map((icon) => (
        <CarouselItem key={icon} aria-label={icon.replace('_', ' ')}>
          <div
            style={{
              display: 'grid',
              placeItems: 'center',
              blockSize: TILE_HEIGHT,
              backgroundColor: 'var(--m3e-sys-color-surface-container-highest)',
            }}
          >
            <Icon name={icon} />
          </div>
        </CarouselItem>
      ))}
    </Carousel>
  );
}
