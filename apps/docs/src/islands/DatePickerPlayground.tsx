import {
  Button,
  DatePicker,
  DatePickerDialog,
  DateRangePicker,
  DockedDatePicker,
  FullScreenDialog,
} from '@kyralabs/m3exp-web/react';
import { useState } from 'react';

type Open = 'none' | 'date' | 'range';

const AUG_17_2025 = Date.UTC(2025, 7, 17);
const iso = (millis: number | null) =>
  millis === null ? 'none' : new Date(millis).toISOString().slice(0, 10);

/**
 * React date pickers: a controlled DatePicker, Compose's DatePickerDialogSample (the picker in a
 * dialog with OK / Cancel) and DateRangePickerSample (the range picker in a full-screen dialog
 * with Save), and the docked picker.
 */
export default function DatePickerPlayground() {
  const [date, setDate] = useState<number | null>(AUG_17_2025);
  const [draft, setDraft] = useState<number | null>(date);
  const [range, setRange] = useState<[number | null, number | null]>([null, null]);
  const [draftRange, setDraftRange] = useState(range);
  const [docked, setDocked] = useState<number | null>(null);
  const [open, setOpen] = useState<Open>('none');
  const close = () => {
    setOpen('none');
  };
  const onOpenChange = (isOpen: boolean) => {
    if (!isOpen) close();
  };
  return (
    <div data-testid="react-date-pickers">
      <p>
        Date: <output data-testid="react-value">{iso(date)}</output>; range:{' '}
        <output data-testid="react-range">
          {iso(range[0])} – {iso(range[1])}
        </output>
        ; docked: <output data-testid="react-docked">{iso(docked)}</output>
      </p>
      <div className="docs-time-picker-row">
        <figure>
          <figcaption>Controlled</figcaption>
          <DatePicker
            selectedDateMillis={date}
            onSelectedDateChange={setDate}
            displayedMonthMillis={AUG_17_2025}
            data-testid="react-picker"
          />
        </figure>
        <figure className="docs-date-docked">
          <figcaption>Docked</figcaption>
          <DockedDatePicker
            selectedDateMillis={docked}
            onSelectedDateChange={setDocked}
            data-testid="react-docked-picker"
          />
        </figure>
      </div>
      <div className="docs-button-row">
        <Button
          onPress={() => {
            setDraft(date);
            setOpen('date');
          }}
          data-testid="react-open-dialog"
        >
          Date picker dialog
        </Button>
        <Button
          variant="tonal"
          onPress={() => {
            setDraftRange(range);
            setOpen('range');
          }}
          data-testid="react-open-range"
        >
          Range in a full-screen dialog
        </Button>
      </div>
      <DatePickerDialog
        isOpen={open === 'date'}
        onOpenChange={onOpenChange}
        aria-label="Select date"
        dismissButton={
          <Button variant="text" onPress={close}>
            Cancel
          </Button>
        }
        confirmButton={
          <Button
            variant="text"
            isDisabled={draft === null}
            onPress={() => {
              setDate(draft);
              close();
            }}
          >
            OK
          </Button>
        }
      >
        <DatePicker
          selectedDateMillis={draft}
          onSelectedDateChange={setDraft}
          displayedMonthMillis={draft ?? AUG_17_2025}
        />
      </DatePickerDialog>
      <FullScreenDialog
        isOpen={open === 'range'}
        onOpenChange={onOpenChange}
        aria-label="Select dates"
        action={
          <Button
            variant="text"
            isDisabled={draftRange[1] === null}
            onPress={() => {
              setRange(draftRange);
              close();
            }}
          >
            Save
          </Button>
        }
      >
        <DateRangePicker
          selectedStartDateMillis={draftRange[0]}
          selectedEndDateMillis={draftRange[1]}
          onSelectedRangeChange={(start, end) => {
            setDraftRange([start, end]);
          }}
          displayedMonthMillis={AUG_17_2025}
        />
      </FullScreenDialog>
    </div>
  );
}
