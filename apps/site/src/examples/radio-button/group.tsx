import { Radio, RadioGroup } from '@kyralabs/m3exp-web/react';

export default function Group() {
  return (
    <RadioGroup aria-label="Notifications" defaultValue="calls" name="notifications">
      <Radio value="all">All notifications</Radio>
      <Radio value="calls">Calls only</Radio>
      <Radio value="none">None</Radio>
      <Radio value="custom" isDisabled>
        Custom (unavailable)
      </Radio>
    </RadioGroup>
  );
}
