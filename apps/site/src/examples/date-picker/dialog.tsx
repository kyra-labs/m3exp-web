import { useState } from 'react';
import { Button, DatePicker, DatePickerDialog } from '@kyralabs/m3exp-web/react';

const AUG_17_2025 = Date.UTC(2025, 7, 17);
const iso = (millis: number | null) =>
  millis === null ? 'none' : new Date(millis).toISOString().slice(0, 10);

export default function Dialog() {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<number | null>(AUG_17_2025);
  const [draft, setDraft] = useState<number | null>(date);
  return (
    <>
      <Button
        variant="tonal"
        onPress={() => {
          setDraft(date);
          setOpen(true);
        }}
      >
        Pick a date
      </Button>
      <p>Date: {iso(date)}</p>
      <DatePickerDialog
        aria-label="Select date"
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
            isDisabled={draft === null}
            onPress={() => {
              setDate(draft);
              setOpen(false);
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
    </>
  );
}
