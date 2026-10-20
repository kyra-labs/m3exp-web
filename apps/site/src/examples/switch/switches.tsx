import { Switch } from '@kyralabs/m3exp-web/react';

export default function Switches() {
  return (
    <div style={{ display: 'grid', gap: 'var(--m3e-sys-space-200)' }}>
      <Switch defaultSelected>Wi-Fi</Switch>
      <Switch checkedIcon="check" uncheckedIcon="close">
        Bluetooth
      </Switch>
      <Switch labelPosition="start" defaultSelected checkedIcon="check">
        Airplane mode
      </Switch>
      <Switch isDisabled>Hotspot</Switch>
    </div>
  );
}
