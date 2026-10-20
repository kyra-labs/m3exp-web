import { useState } from 'react';
import { AlertDialog, Button } from '@kyralabs/m3exp-web/react';

export default function Alert() {
  const [open, setOpen] = useState(false);
  const close = () => {
    setOpen(false);
  };
  return (
    <>
      <Button
        variant="tonal"
        onPress={() => {
          setOpen(true);
        }}
      >
        Discard draft
      </Button>
      <AlertDialog
        isOpen={open}
        onOpenChange={setOpen}
        icon="delete"
        headline="Discard draft?"
        dismissButton={
          <Button variant="text" onPress={close}>
            Cancel
          </Button>
        }
        confirmButton={
          <Button variant="text" onPress={close}>
            Discard
          </Button>
        }
      >
        This permanently deletes the draft.
      </AlertDialog>
    </>
  );
}
