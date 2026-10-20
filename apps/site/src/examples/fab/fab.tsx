import { Fab, Icon } from '@kyralabs/m3exp-web/react';

export default function Fabs() {
  return (
    <>
      <Fab icon={<Icon name="edit" />} aria-label="Compose" />
      <Fab
        size="medium"
        color="secondary-container"
        icon={<Icon name="edit" />}
        aria-label="Compose"
      />
      <Fab
        size="large"
        color="tertiary-container"
        icon={<Icon name="edit" />}
        aria-label="Compose"
      />
    </>
  );
}
