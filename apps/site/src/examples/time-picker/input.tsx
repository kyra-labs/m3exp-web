import { TimeInput } from '@kyralabs/m3exp-web/react';

export default function Input() {
  return <TimeInput defaultValue={{ hour: 14, minute: 5 }} is24Hour />;
}
