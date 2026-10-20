import { TextField } from '@kyralabs/m3exp-web/react';

export default function Variants() {
  return (
    <div style={{ display: 'grid', gap: 'var(--m3e-sys-space-300)', inlineSize: '100%' }}>
      <TextField variant="filled" label="First name" supportingText="As on your passport" />
      <TextField variant="outlined" label="Last name" />
      <TextField variant="outlined" label="Nickname" labelPosition="above" placeholder="Optional" />
    </div>
  );
}
