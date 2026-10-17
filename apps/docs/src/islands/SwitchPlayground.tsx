import { Switch } from '@kyralabs/m3exp-web/react';
import { useState } from 'react';

/**
 * React switches: Compose's SwitchSample and SwitchWithThumbIconSample, m3.material.io's check /
 * close pair, a leading label, and a switch that disables the others.
 */
export default function SwitchPlayground() {
  const [demo, setDemo] = useState(true);
  const [disabled, setDisabled] = useState(false);
  return (
    <div data-testid="react-switches">
      <div className="docs-switch-row">
        <Switch isSelected={demo} onChange={setDemo} isDisabled={disabled}>
          Demo
        </Switch>
        <Switch defaultSelected checkedIcon="check" isDisabled={disabled}>
          Demo with icon
        </Switch>
        <Switch checkedIcon="check" uncheckedIcon="close" isDisabled={disabled}>
          Both icons
        </Switch>
      </div>
      <div className="docs-switch-list">
        <Switch
          className="docs-switch-list__item"
          labelPosition="start"
          isSelected={disabled}
          onChange={setDisabled}
        >
          Disable the others
        </Switch>
      </div>
    </div>
  );
}
