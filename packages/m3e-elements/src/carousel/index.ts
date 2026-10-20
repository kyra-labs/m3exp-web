import { M3eCarousel, M3eCarouselItem } from './carousel.js';

// Only the classes (m3e-react exports its own carousel components; one name per package in the
// umbrella). CarouselLayout has its own entry (carousel-layout.js).
export {
  M3eCarousel,
  M3eCarouselItem,
  type CarouselActionDetail,
  type M3eCarouselEventMap,
  type M3eCarouselItemEventMap,
} from './carousel.js';

M3eCarousel.define('m3e-carousel');
M3eCarouselItem.define('m3e-carousel-item');

declare global {
  interface HTMLElementTagNameMap {
    'm3e-carousel': M3eCarousel;
    'm3e-carousel-item': M3eCarouselItem;
  }
}
