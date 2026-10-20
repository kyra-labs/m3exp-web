import { Icon, TextField } from '@kyralabs/m3exp-web/react';

export default function States() {
  return (
    <div style={{ display: 'grid', gap: 'var(--m3e-sys-space-300)', inlineSize: '100%' }}>
      <TextField
        variant="outlined"
        label="Email"
        type="email"
        defaultValue="ada@example"
        isInvalid
        errorMessage="Enter a full address, like ada@example.com"
        trailingIcon={<Icon name="error" />}
      />
      <TextField
        variant="filled"
        label="Amount"
        inputMode="decimal"
        prefix="€"
        suffix="EUR"
        leadingIcon={<Icon name="payments" />}
      />
      <TextField variant="outlined" label="Bio" multiline maxLength={120} />
      <TextField variant="filled" label="Account" defaultValue="ada-lovelace" isDisabled />
    </div>
  );
}
