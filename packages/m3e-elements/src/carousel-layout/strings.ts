/**
 * The default accessible name of a carousel item: its position, "2 of 5" (WAI-ARIA APG carousel
 * slides; m3.material.io Carousel › Accessibility: the label reads the current item and the
 * total). Both layers take an override for other languages.
 */
export function carouselItemLabel(index: number, count: number): string {
  return `${String(index + 1)} of ${String(count)}`;
}
