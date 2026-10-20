import { Fab, Icon } from '@kyralabs/m3exp-web/react';

/** Deprecated (D4): the small FAB is no longer recommended; use the baseline FAB. */
export default function LegacySmall() {
  return <Fab size="small" icon={<Icon name="edit" />} aria-label="Compose" />;
}
