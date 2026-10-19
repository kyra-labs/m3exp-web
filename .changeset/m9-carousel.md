---
'@kyralabs/m3e-tokens': minor
'@kyralabs/m3e-motion': minor
'@kyralabs/m3e-css': minor
'@kyralabs/m3e-elements': minor
'@kyralabs/m3e-react': minor
'@kyralabs/m3exp-web': minor
---

Carousel (M9, COMPONENT_SPEC §36): the multi-browse, uncontained and center-aligned hero carousels of Compose Material3, the start-aligned hero, and a CSS-only full-screen layout. m3e-motion ports Compose's carousel math (Arrangement, keylines, Strategy, snap positions and the per-item mask and translation), checked against the Compose host tests and a JVM reference; items grow and shrink as they scroll, masked with extra-large corners, and snap natively one at a time to their keylines (the uncontained layout scrolls freely). Every item is a tab stop and the arrow keys move between them (WAI-ARIA carousel and slides); link and button items show the state layer and ripple; reduced motion keeps every item at one size. New `components/carousel-defaults.css` tokens, m3e-css `carousel.css`, the m3e-elements `<m3e-carousel>` / `<m3e-carousel-item>` and `carousel-layout` (`CarouselLayout`) entries, and m3e-react `<Carousel>` / `<CarouselItem>`.
