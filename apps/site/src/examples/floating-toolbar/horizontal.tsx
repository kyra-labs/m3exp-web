import { FloatingToolbar, Icon, IconButton } from '@kyralabs/m3exp-web/react';

const FORMAT = [
  ['format_bold', 'Bold'],
  ['format_italic', 'Italic'],
  ['format_underlined', 'Underline'],
] as const;

export default function Horizontal() {
  return (
    <>
      {(['standard', 'vibrant'] as const).map((colorStyle) => (
        <FloatingToolbar
          key={colorStyle}
          aria-label={`Formatting, ${colorStyle}`}
          colorStyle={colorStyle}
        >
          {FORMAT.map(([icon, label]) => (
            <IconButton key={icon} aria-label={label}>
              <Icon name={icon} />
            </IconButton>
          ))}
        </FloatingToolbar>
      ))}
    </>
  );
}
