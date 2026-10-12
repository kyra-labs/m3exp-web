import { AssistChip, Icon } from '@kyralabs/m3exp-web/react';
import { useState } from 'react';

/** React assist chips (React Aria; ripple from the press point). */
export default function AssistChipPlayground() {
  const [pressed, setPressed] = useState(0);
  const onPress = () => {
    setPressed((n) => n + 1);
  };
  return (
    <div>
      <div className="docs-button-row" data-testid="react-chips">
        <AssistChip leadingIcon={<Icon name="add" />} onPress={onPress}>
          Add to calendar
        </AssistChip>
        <AssistChip variant="elevated" leadingIcon={<Icon name="favorite" />} onPress={onPress}>
          Save
        </AssistChip>
        <AssistChip isDisabled leadingIcon={<Icon name="settings" />}>
          Disabled
        </AssistChip>
      </div>
      <p aria-live="polite">Pressed {pressed} times.</p>
    </div>
  );
}
