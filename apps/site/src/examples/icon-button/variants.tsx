import { Icon, IconButton } from '@kyralabs/m3exp-web/react';

export default function Variants() {
  return (
    <>
      <IconButton variant="standard" size="m" aria-label="Settings">
        <Icon name="settings" />
      </IconButton>
      <IconButton variant="filled" size="m" aria-label="Settings">
        <Icon name="settings" />
      </IconButton>
      <IconButton variant="tonal" size="m" aria-label="Settings">
        <Icon name="settings" />
      </IconButton>
      <IconButton variant="outlined" size="m" aria-label="Settings">
        <Icon name="settings" />
      </IconButton>
    </>
  );
}
