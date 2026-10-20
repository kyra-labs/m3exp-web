import { Slider } from '@kyralabs/m3exp-web/react';

export default function Standard() {
  return (
    <div style={{ display: 'grid', gap: 'var(--m3e-sys-space-300)', inlineSize: '100%' }}>
      <Slider aria-label="Volume" defaultValue={0.4} icon="volume_up" size="m" />
      <Slider aria-label="Brightness" defaultValue={60} minValue={0} maxValue={100} step={10} />
      <Slider aria-label="Disabled" defaultValue={0.3} isDisabled />
    </div>
  );
}
