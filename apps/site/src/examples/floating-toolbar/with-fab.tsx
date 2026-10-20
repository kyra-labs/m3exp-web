import { useState } from 'react';
import { Fab, FloatingToolbar, Icon, IconButton } from '@kyralabs/m3exp-web/react';

export default function WithFab() {
  const [expanded, setExpanded] = useState(true);
  return (
    <FloatingToolbar
      aria-label="Actions"
      colorStyle="vibrant"
      isExpanded={expanded}
      onExpandedChange={setExpanded}
      fab={
        <Fab
          icon={<Icon name={expanded ? 'close' : 'add'} />}
          aria-label={expanded ? 'Collapse toolbar' : 'Expand toolbar'}
          onPress={() => {
            setExpanded((e) => !e);
          }}
        />
      }
    >
      <IconButton aria-label="Search">
        <Icon name="search" />
      </IconButton>
      <IconButton aria-label="Edit">
        <Icon name="edit" />
      </IconButton>
      <IconButton aria-label="Share">
        <Icon name="share" />
      </IconButton>
    </FloatingToolbar>
  );
}
