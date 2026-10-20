import {
  Button,
  TimeInput,
  TimePicker,
  TimePickerDialog,
  TimePickerModeToggle,
  TimeScroll,
  type TimeValue,
  VibrantTimePickerDialog,
} from '@kyralabs/m3exp-web/react';
import { useState } from 'react';

type Open = 'none' | 'dialog' | 'vibrant';

const format = ({ hour, minute }: TimeValue) =>
  `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

/**
 * React time pickers: a controlled dial, Compose's TimePickerSwitchableSample (a dialog whose mode
 * toggle switches between the dial and the input) and the vibrant dialog with the scroll wheels.
 */
export default function TimePickerPlayground() {
  const [value, setValue] = useState<TimeValue>({ hour: 13, minute: 30 });
  const [open, setOpen] = useState<Open>('none');
  const [showDial, setShowDial] = useState(true);
  const [draft, setDraft] = useState(value);
  const show = (which: Open) => () => {
    setDraft(value);
    setOpen(which);
  };
  const close = () => {
    setOpen('none');
  };
  const confirm = () => {
    setValue(draft);
    setOpen('none');
  };
  const onOpenChange = (isOpen: boolean) => {
    if (!isOpen) close();
  };
  return (
    <div data-testid="react-time-pickers">
      <p>
        Time: <output data-testid="react-value">{format(value)}</output>
      </p>
      <div className="docs-time-picker-row">
        <figure>
          <figcaption>Controlled dial</figcaption>
          <TimePicker value={value} onChange={setValue} is24Hour={false} layout="vertical" />
        </figure>
        <figure>
          <figcaption>Input</figcaption>
          <TimeInput value={value} onChange={setValue} is24Hour={false} />
        </figure>
      </div>
      <div className="docs-button-row">
        <Button onPress={show('dialog')} data-testid="react-open-dialog">
          Switchable dialog
        </Button>
        <Button variant="tonal" onPress={show('vibrant')} data-testid="react-open-vibrant">
          Vibrant dialog
        </Button>
      </div>
      <TimePickerDialog
        isOpen={open === 'dialog'}
        onOpenChange={onOpenChange}
        title={showDial ? 'Select Time' : 'Enter Time'}
        modeToggleButton={
          <TimePickerModeToggle
            displayMode={showDial ? 'picker' : 'input'}
            onDisplayModeChange={(next) => {
              setShowDial(next === 'picker');
            }}
          />
        }
        dismissButton={
          <Button variant="text" onPress={close}>
            Cancel
          </Button>
        }
        confirmButton={
          <Button variant="text" onPress={confirm} data-testid="react-dialog-ok">
            OK
          </Button>
        }
      >
        {showDial ? (
          <TimePicker value={draft} onChange={setDraft} is24Hour={false} />
        ) : (
          <TimeInput value={draft} onChange={setDraft} is24Hour={false} />
        )}
      </TimePickerDialog>
      <VibrantTimePickerDialog
        isOpen={open === 'vibrant'}
        onOpenChange={onOpenChange}
        aria-label="Select time"
        dismissButton={
          <Button variant="text" onPress={close}>
            Cancel
          </Button>
        }
        confirmButton={
          <Button variant="text" onPress={confirm}>
            OK
          </Button>
        }
      >
        <TimeScroll value={draft} onChange={setDraft} is24Hour={false} />
      </VibrantTimePickerDialog>
    </div>
  );
}
