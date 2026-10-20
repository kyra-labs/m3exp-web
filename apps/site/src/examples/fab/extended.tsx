import { useState } from 'react';
import { ExtendedFab, Icon, Switch } from '@kyralabs/m3exp-web/react';

export default function Extended() {
  const [expanded, setExpanded] = useState(true);
  return (
    <>
      <ExtendedFab icon={<Icon name="edit" />} label="Compose" isExpanded={expanded} />
      <ExtendedFab
        size="medium"
        color="secondary"
        icon={<Icon name="navigation" />}
        label="Navigate"
      />
      <Switch isSelected={expanded} onChange={setExpanded}>
        Expanded
      </Switch>
    </>
  );
}
