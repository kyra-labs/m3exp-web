import { useState } from 'react';
import { Button, DateRangePicker, FullScreenDialog } from '@kyralabs/m3exp-web/react';

const AUG_2025 = Date.UTC(2025, 7, 1);
const iso = (millis: number | null) =>
  millis === null ? '…' : new Date(millis).toISOString().slice(0, 10);

export default function Range() {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<[number | null, number | null]>([null, null]);
  const [draft, setDraft] = useState(range);
  return (
    <>
      <Button
        variant="tonal"
        onPress={() => {
          setDraft(range);
          setOpen(true);
        }}
      >
        Pick dates
      </Button>
      <p>
        Trip: {iso(range[0])} – {iso(range[1])}
      </p>
      <FullScreenDialog
        aria-label="Select dates"
        isOpen={open}
        onOpenChange={setOpen}
        action={
          <Button
            variant="text"
            isDisabled={draft[1] === null}
            onPress={() => {
              setRange(draft);
              setOpen(false);
            }}
          >
            Save
          </Button>
        }
      >
        <DateRangePicker
          selectedStartDateMillis={draft[0]}
          selectedEndDateMillis={draft[1]}
          onSelectedRangeChange={(start, end) => {
            setDraft([start, end]);
          }}
          displayedMonthMillis={AUG_2025}
        />
      </FullScreenDialog>
    </>
  );
}
