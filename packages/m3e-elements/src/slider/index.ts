import { M3eSlider } from './slider.js';

// Only the class and its event detail (m3e-react exports the Slider components; one name per
// package in the umbrella). Registers <m3e-slider>. The contract helpers have their own entry
// (slider-layout.js).
export { M3eSlider, type SliderValueDetail, renderSliderTrack } from './slider.js';

M3eSlider.define('m3e-slider');

declare global {
  interface HTMLElementTagNameMap {
    'm3e-slider': M3eSlider;
  }
}
