/* eslint-disable @typescript-eslint/no-deprecated -- D4: the docs show the deprecated segmented button */
import {
  Checkbox,
  Icon,
  MultiChoiceSegmentedButtonRow,
  SegmentedButton,
  SingleChoiceSegmentedButtonRow,
} from '@kyralabs/m3exp-web/react';
import { useState } from 'react';

const RANGES = ['Day', 'Month', 'Week'];
const FILTERS = [
  { value: 'Favorites', icon: 'star' },
  { value: 'Trending', icon: 'trending_up' },
  { value: 'Saved', icon: 'bookmark' },
];

/**
 * React segmented buttons: Compose's single-select and multi-select samples, with a checkbox that
 * disables both rows.
 */
export default function SegmentedButtonPlayground() {
  const [range, setRange] = useState('Day');
  const [filters, setFilters] = useState<string[]>([]);
  const [disabled, setDisabled] = useState(false);
  return (
    <div data-testid="react-segmented" className="docs-segmented-stack">
      <SingleChoiceSegmentedButtonRow
        aria-label="Range"
        value={range}
        onChange={setRange}
        isDisabled={disabled}
      >
        {RANGES.map((r) => (
          <SegmentedButton key={r} value={r}>
            {r}
          </SegmentedButton>
        ))}
      </SingleChoiceSegmentedButtonRow>
      <MultiChoiceSegmentedButtonRow
        aria-label="Filters"
        value={filters}
        onChange={setFilters}
        isDisabled={disabled}
      >
        {FILTERS.map((f) => (
          <SegmentedButton key={f.value} value={f.value} icon={<Icon name={f.icon} />}>
            {f.value}
          </SegmentedButton>
        ))}
      </MultiChoiceSegmentedButtonRow>
      <p data-testid="react-segmented-value">
        Range: {range}; filters: {filters.length > 0 ? filters.join(', ') : 'none'}
      </p>
      <Checkbox isSelected={disabled} onChange={setDisabled}>
        Disabled
      </Checkbox>
    </div>
  );
}
