import { BottomAppBar, Fab, Icon, IconButton } from '@kyralabs/m3exp-web/react';

/** Deprecated (D4): use DockedToolbar, with a FloatingToolbar or FAB for the main action. */
export default function LegacyBottomAppBar() {
  return (
    <BottomAppBar
      aria-label="Actions"
      style={{ inlineSize: '100%' }}
      actions={
        <>
          <IconButton aria-label="Done">
            <Icon name="check" />
          </IconButton>
          <IconButton aria-label="Edit">
            <Icon name="edit" />
          </IconButton>
          <IconButton aria-label="Delete">
            <Icon name="delete" />
          </IconButton>
        </>
      }
      floatingActionButton={<Fab icon={<Icon name="add" />} aria-label="Add" />}
    />
  );
}
