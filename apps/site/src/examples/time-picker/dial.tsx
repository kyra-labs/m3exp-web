import { useState } from 'react';
import { TimePicker, type TimeValue } from '@kyralabs/m3exp-web/react';

export default function Dial() {
  const [time, setTime] = useState<TimeValue>({ hour: 7, minute: 30 });
  return (
    <div>
      <TimePicker value={time} onChange={setTime} layout="vertical" />
      <p>
        Alarm: {String(time.hour).padStart(2, '0')}:{String(time.minute).padStart(2, '0')}
      </p>
    </div>
  );
}
