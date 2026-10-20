import { useState } from 'react';
import { ButtonGroup, ButtonGroupItem } from '@kyralabs/m3exp-web/react';

export default function Connected() {
  const [view, setView] = useState<string>('week');
  return (
    <ButtonGroup
      aria-label="View"
      variant="connected"
      selectionMode="single"
      disallowEmptySelection
      buttonVariant="tonal"
      selectedKeys={[view]}
      onSelectionChange={(keys) => {
        const [key] = keys;
        if (key !== undefined) setView(String(key));
      }}
    >
      <ButtonGroupItem id="day">Day</ButtonGroupItem>
      <ButtonGroupItem id="week">Week</ButtonGroupItem>
      <ButtonGroupItem id="month">Month</ButtonGroupItem>
    </ButtonGroup>
  );
}
