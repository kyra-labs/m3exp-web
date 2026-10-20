import { ButtonGroup, ButtonGroupItem } from '@kyralabs/m3exp-web/react';

export default function Standard() {
  return (
    <ButtonGroup aria-label="Formatting" size="m" buttonVariant="tonal">
      <ButtonGroupItem id="bold" icon="format_bold" aria-label="Bold" />
      <ButtonGroupItem id="italic" icon="format_italic" aria-label="Italic" />
      <ButtonGroupItem id="underline" icon="format_underlined" aria-label="Underline" />
      <ButtonGroupItem id="more">More</ButtonGroupItem>
    </ButtonGroup>
  );
}
