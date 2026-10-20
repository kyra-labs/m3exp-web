import { useState } from 'react';
import { Button, TimePicker, TimePickerDialog, type TimeValue } from '@kyralabs/m3exp-web/react';

export default function Dialog() {
  const [open, setOpen] = useState(false);
  const [time, setTime] = useState<TimeValue>({ hour: 18, minute: 0 });
  const [draft, setDraft] = useState(time);
  return (
    <>
      <Button
        variant="tonal"
        onPress={() => {
          setDraft(time);
          setOpen(true);
        }}
      >
        Pick a time
      </Button>
      <p>
        Time: {String(time.hour).padStart(2, '0')}:{String(time.minute).padStart(2, '0')}
      </p>
      <TimePickerDialog
        aria-label="Select time"
        title="Select time"
        isOpen={open}
        onOpenChange={setOpen}
        dismissButton={
          <Button
            variant="text"
            onPress={() => {
              setOpen(false);
            }}
          >
            Cancel
          </Button>
        }
        confirmButton={
          <Button
            variant="text"
            onPress={() => {
              setTime(draft);
              setOpen(false);
            }}
          >
            OK
          </Button>
        }
      >
        <TimePicker value={draft} onChange={setDraft} />
      </TimePickerDialog>
    </>
  );
}
