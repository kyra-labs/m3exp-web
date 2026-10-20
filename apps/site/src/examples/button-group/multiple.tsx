import { ButtonGroup, ButtonGroupItem } from '@kyralabs/m3exp-web/react';

export default function Multiple() {
  return (
    <ButtonGroup
      aria-label="Filters"
      variant="connected"
      selectionMode="multiple"
      buttonVariant="outlined"
      defaultSelectedKeys={['wifi']}
    >
      <ButtonGroupItem id="wifi" icon="wifi">
        Wi-Fi
      </ButtonGroupItem>
      <ButtonGroupItem id="bluetooth" icon="bluetooth">
        Bluetooth
      </ButtonGroupItem>
      <ButtonGroupItem id="location" icon="location_on">
        Location
      </ButtonGroupItem>
    </ButtonGroup>
  );
}
