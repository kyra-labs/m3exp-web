import { ToggleButton } from '@kyralabs/m3exp-web/react';

export default function Toggle() {
  return (
    <>
      <ToggleButton variant="filled">Filled</ToggleButton>
      <ToggleButton variant="tonal" defaultSelected>
        Tonal
      </ToggleButton>
      <ToggleButton variant="elevated">Elevated</ToggleButton>
      <ToggleButton variant="outlined" defaultSelected>
        Outlined
      </ToggleButton>
    </>
  );
}
