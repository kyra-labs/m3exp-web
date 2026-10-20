import { SegmentedButton, SingleChoiceSegmentedButtonRow } from '@kyralabs/m3exp-web/react';

/** Deprecated (DECISIONS D4): use a connected ButtonGroup. */
export default function Single() {
  return (
    <SingleChoiceSegmentedButtonRow aria-label="Range" defaultValue="day">
      <SegmentedButton value="day">Day</SegmentedButton>
      <SegmentedButton value="week">Week</SegmentedButton>
      <SegmentedButton value="month">Month</SegmentedButton>
    </SingleChoiceSegmentedButtonRow>
  );
}
