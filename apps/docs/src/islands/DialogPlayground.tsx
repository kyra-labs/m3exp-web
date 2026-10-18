import { AlertDialog, BasicAlertDialog, Button, FullScreenDialog } from '@kyralabs/m3exp-web/react';
import { useState } from 'react';

type Open = 'none' | 'alert' | 'custom' | 'full-screen';

/**
 * React dialogs, controlled: the alert dialog (the Compose AlertDialogSample), custom content
 * (BasicAlertDialogSample) and a full-screen dialog; the last decision is shown below.
 */
export default function DialogPlayground() {
  const [open, setOpen] = useState<Open>('none');
  const [last, setLast] = useState('none');
  const close = (result: string) => () => {
    setLast(result);
    setOpen('none');
  };
  const onOpenChange = (isOpen: boolean) => {
    if (!isOpen) close('dismissed')();
  };
  return (
    <div data-testid="react-dialogs">
      <div className="docs-button-row">
        <Button
          onPress={() => {
            setOpen('alert');
          }}
          data-testid="react-open-alert"
        >
          Alert dialog
        </Button>
        <Button
          variant="tonal"
          onPress={() => {
            setOpen('custom');
          }}
          data-testid="react-open-custom"
        >
          Custom content
        </Button>
        <Button
          variant="outlined"
          onPress={() => {
            setOpen('full-screen');
          }}
          data-testid="react-open-full-screen"
        >
          Full-screen
        </Button>
      </div>
      <p>
        Last result: <output data-testid="react-last">{last}</output>
      </p>
      <AlertDialog
        isOpen={open === 'alert'}
        onOpenChange={onOpenChange}
        icon="favorite"
        headline="Title"
        dismissButton={
          <Button variant="text" onPress={close('Dismiss')}>
            Dismiss
          </Button>
        }
        confirmButton={
          <Button variant="text" onPress={close('Confirm')} data-testid="react-confirm">
            Confirm
          </Button>
        }
        data-testid="react-alert"
      >
        This area typically contains the supportive text which presents the details regarding the
        Dialog&apos;s purpose.
      </AlertDialog>
      <BasicAlertDialog
        isOpen={open === 'custom'}
        onOpenChange={onOpenChange}
        aria-label="Supportive text"
        data-testid="react-custom"
      >
        <div className="m3e-surface m3e-surface--shape-large docs-dialog-custom">
          <p>
            This area typically contains the supportive text which presents the details regarding
            the Dialog&apos;s purpose.
          </p>
          <Button variant="text" onPress={close('Confirm')}>
            Confirm
          </Button>
        </div>
      </BasicAlertDialog>
      <FullScreenDialog
        isOpen={open === 'full-screen'}
        onOpenChange={onOpenChange}
        headline="New event"
        action={
          <Button variant="text" onPress={close('Save')}>
            Save
          </Button>
        }
        data-testid="react-full-screen"
      >
        <p>Event details go here.</p>
      </FullScreenDialog>
    </div>
  );
}
