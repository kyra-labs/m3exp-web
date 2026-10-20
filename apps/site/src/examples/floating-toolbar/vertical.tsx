import { FloatingToolbar, Icon, IconButton } from '@kyralabs/m3exp-web/react';

export default function Vertical() {
  return (
    <FloatingToolbar
      aria-label="Editing"
      orientation="vertical"
      leading={
        <IconButton aria-label="Done">
          <Icon name="check" />
        </IconButton>
      }
      trailing={
        <IconButton aria-label="Favorite">
          <Icon name="favorite" />
        </IconButton>
      }
    >
      <IconButton aria-label="Bold">
        <Icon name="format_bold" />
      </IconButton>
      <IconButton aria-label="Italic">
        <Icon name="format_italic" />
      </IconButton>
    </FloatingToolbar>
  );
}
