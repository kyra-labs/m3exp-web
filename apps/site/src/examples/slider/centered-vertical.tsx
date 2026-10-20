import { Slider } from '@kyralabs/m3exp-web/react';

export default function CenteredVertical() {
  return (
    <div style={{ display: 'grid', gap: 'var(--m3e-sys-space-300)', inlineSize: '100%' }}>
      <Slider
        aria-label="Balance"
        variant="centered"
        minValue={-50}
        maxValue={50}
        defaultValue={20}
      />
      <Slider
        aria-label="Bass"
        orientation="vertical"
        size="l"
        defaultValue={0.6}
        style={{ blockSize: 'calc(var(--m3e-sys-space-900) + var(--m3e-sys-space-900))' }}
      />
    </div>
  );
}
