import { Fab, Icon } from '@kyralabs/m3exp-web/react';

const COLORS = [
  'primary-container',
  'secondary-container',
  'tertiary-container',
  'primary',
  'secondary',
  'tertiary',
] as const;

export default function Colors() {
  return (
    <>
      {COLORS.map((color) => (
        <Fab
          key={color}
          color={color}
          icon={<Icon name="add" />}
          aria-label={`Create (${color})`}
        />
      ))}
    </>
  );
}
