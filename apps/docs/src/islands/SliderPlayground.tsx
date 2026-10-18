import { RangeSlider, Slider } from '@kyralabs/m3exp-web/react';
import { useState } from 'react';

/**
 * React sliders: Compose's SliderSample / StepsSliderSample (0..100 in tens), RangeSliderSample,
 * CenteredSliderSample (-50..50), a medium slider with an inset icon, and a vertical one.
 */
export default function SliderPlayground() {
  const [value, setValue] = useState(0.4);
  const [range, setRange] = useState<[number, number]>([20, 80]);
  const [disabled, setDisabled] = useState(false);
  return (
    <div data-testid="react-sliders" className="docs-slider-stack">
      <div className="docs-slider-row">
        <span className="docs-slider-row__label">
          Continuous <output>{value.toFixed(2)}</output>
        </span>
        <Slider aria-label="Volume" value={value} onChange={setValue} isDisabled={disabled} />
      </div>
      <div className="docs-slider-row">
        <span className="docs-slider-row__label">Steps of 10</span>
        <Slider
          aria-label="Percent"
          maxValue={100}
          step={10}
          defaultValue={40}
          isDisabled={disabled}
        />
      </div>
      <div className="docs-slider-row">
        <span className="docs-slider-row__label">
          Range <output>{`${String(range[0])} – ${String(range[1])}`}</output>
        </span>
        <RangeSlider
          aria-label="Price"
          maxValue={100}
          step={10}
          value={range}
          onChange={setRange}
          isDisabled={disabled}
        />
      </div>
      <div className="docs-slider-row">
        <span className="docs-slider-row__label">Centered</span>
        <Slider
          aria-label="Balance"
          variant="centered"
          minValue={-50}
          maxValue={50}
          defaultValue={10}
          isDisabled={disabled}
        />
      </div>
      <div className="docs-slider-row">
        <span className="docs-slider-row__label">Medium with icon</span>
        <Slider
          aria-label="Media volume"
          size="m"
          icon="volume_up"
          maxValue={100}
          defaultValue={60}
          isDisabled={disabled}
        />
      </div>
      <div className="docs-slider-verticals">
        <Slider
          aria-label="Brightness"
          orientation="vertical"
          maxValue={100}
          step={10}
          defaultValue={30}
          isDisabled={disabled}
        />
      </div>
      <label className="docs-slider-row">
        <input
          type="checkbox"
          checked={disabled}
          onChange={(e) => {
            setDisabled(e.target.checked);
          }}
        />{' '}
        Disable the sliders
      </label>
    </div>
  );
}
