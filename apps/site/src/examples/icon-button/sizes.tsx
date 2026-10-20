import { Icon, IconButton } from '@kyralabs/m3exp-web/react';

const SIZES = ['xs', 's', 'm', 'l', 'xl'] as const;

export default function Sizes() {
  return (
    <>
      {SIZES.map((size) => (
        <IconButton key={size} variant="filled" size={size} aria-label={`Add (${size})`}>
          <Icon name="add" />
        </IconButton>
      ))}
      <IconButton variant="tonal" size="m" width="narrow" aria-label="Add (narrow)">
        <Icon name="add" />
      </IconButton>
      <IconButton variant="tonal" size="m" width="wide" aria-label="Add (wide)">
        <Icon name="add" />
      </IconButton>
    </>
  );
}
