import { Radio, RadioGroup } from '@kyralabs/m3exp-web/react';
import { useState } from 'react';

const OPTIONS = ['Calls', 'Missed', 'Friends'];

/** React radio groups: Compose's RadioGroupSample, plus a horizontal group with a disable switch. */
export default function RadioButtonPlayground() {
  const [selected, setSelected] = useState('Calls');
  const [size, setSize] = useState('medium');
  const [disabled, setDisabled] = useState('enabled');
  return (
    <div data-testid="react-radios">
      <RadioGroup aria-label="Notifications" value={selected} onChange={setSelected}>
        {OPTIONS.map((o) => (
          <Radio key={o} value={o}>
            {o}
          </Radio>
        ))}
      </RadioGroup>
      <RadioGroup
        aria-label="State"
        orientation="horizontal"
        value={disabled}
        onChange={setDisabled}
        className="docs-radio-row"
      >
        <Radio value="enabled">Enabled</Radio>
        <Radio value="disabled">Disabled</Radio>
      </RadioGroup>
      <RadioGroup
        aria-label="Size"
        orientation="horizontal"
        value={size}
        onChange={setSize}
        isDisabled={disabled === 'disabled'}
        className="docs-radio-row"
      >
        <Radio value="small">Small</Radio>
        <Radio value="medium">Medium</Radio>
        <Radio value="large">Large</Radio>
      </RadioGroup>
    </div>
  );
}
