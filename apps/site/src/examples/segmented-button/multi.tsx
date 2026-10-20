import { MultiChoiceSegmentedButtonRow, SegmentedButton } from '@kyralabs/m3exp-web/react';

/** Deprecated (DECISIONS D4): use a ButtonGroup of toggle buttons. */
export default function Multi() {
  return (
    <MultiChoiceSegmentedButtonRow aria-label="Filters" defaultValue={['walk', 'bike']}>
      <SegmentedButton value="walk">Walk</SegmentedButton>
      <SegmentedButton value="bike">Bike</SegmentedButton>
      <SegmentedButton value="transit">Transit</SegmentedButton>
    </MultiChoiceSegmentedButtonRow>
  );
}
