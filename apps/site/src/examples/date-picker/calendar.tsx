import { useState } from 'react';
import { DatePicker } from '@kyralabs/m3exp-web/react';

const AUG_17_2025 = Date.UTC(2025, 7, 17);

export default function Calendar() {
  const [date, setDate] = useState<number | null>(AUG_17_2025);
  return (
    <div>
      <DatePicker
        selectedDateMillis={date}
        onSelectedDateChange={setDate}
        defaultDisplayMode="picker"
      />
      <p>Selected: {date === null ? 'none' : new Date(date).toISOString().slice(0, 10)}</p>
    </div>
  );
}
