import { Checkbox } from '@kyralabs/m3exp-web/react';

export default function States() {
  return (
    <div style={{ display: 'grid' }}>
      <Checkbox>Unchecked</Checkbox>
      <Checkbox defaultSelected>Checked</Checkbox>
      <Checkbox isIndeterminate>Indeterminate</Checkbox>
      <Checkbox isInvalid>Invalid</Checkbox>
      <Checkbox isDisabled defaultSelected>
        Disabled
      </Checkbox>
    </div>
  );
}
