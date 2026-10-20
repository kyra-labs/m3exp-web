import { Surface } from '@kyralabs/m3exp-web/react';

const TILE = {
  display: 'grid',
  placeItems: 'center',
  inlineSize: 'calc(var(--m3e-sys-space-900) + var(--m3e-sys-space-800))',
  blockSize: 'var(--m3e-sys-space-900)',
};

export default function Surfaces() {
  return (
    <>
      <Surface container="lowest" shape="medium" style={TILE}>
        Lowest
      </Surface>
      <Surface container="high" shape="medium" elevation={1} style={TILE}>
        High, level 1
      </Surface>
      <Surface container="highest" shape="large" elevation={3} style={TILE}>
        Highest, level 3
      </Surface>
      <Surface variant shape="extra-large" style={TILE}>
        Variant
      </Surface>
    </>
  );
}
