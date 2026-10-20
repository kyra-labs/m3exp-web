import { DockedDatePicker } from '@kyralabs/m3exp-web/react';

export default function Docked() {
  return <DockedDatePicker label="Departure" defaultSelectedDateMillis={Date.UTC(2025, 7, 17)} />;
}
