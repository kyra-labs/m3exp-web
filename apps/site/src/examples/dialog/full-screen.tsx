import { useState } from 'react';
import { Button, FullScreenDialog, TextField } from '@kyralabs/m3exp-web/react';

export default function FullScreen() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="outlined"
        onPress={() => {
          setOpen(true);
        }}
      >
        New event
      </Button>
      <FullScreenDialog
        isOpen={open}
        onOpenChange={setOpen}
        headline="New event"
        action={
          <Button
            variant="text"
            onPress={() => {
              setOpen(false);
            }}
          >
            Save
          </Button>
        }
      >
        <TextField label="Title" />
      </FullScreenDialog>
    </>
  );
}
