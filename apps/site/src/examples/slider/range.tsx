import { RangeSlider } from '@kyralabs/m3exp-web/react';

export default function Range() {
  return (
    <RangeSlider
      aria-label="Price"
      thumbLabels={['Minimum price', 'Maximum price']}
      minValue={0}
      maxValue={500}
      step={10}
      defaultValue={[100, 350]}
      formatOptions={{ style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }}
    />
  );
}
