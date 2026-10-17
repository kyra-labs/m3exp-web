import {
  ChipSet,
  FilterChip,
  Icon,
  InputChip,
  InputChipGroup,
  SuggestionChip,
} from '@kyralabs/m3exp-web/react';
import { useState } from 'react';

const PEOPLE = ['Ada Lovelace', 'Grace Hopper', 'Alan Turing', 'Katherine Johnson'];

/**
 * React chips: Compose's FilterChipSample (baseline) and FilterChipWithCornerMorphingSample
 * (expressive), InputChipSample with removal, SuggestionChipSample, in chip sets.
 */
export default function ChipsPlayground() {
  const [people, setPeople] = useState(PEOPLE);
  const [reply, setReply] = useState('none');
  return (
    <div data-testid="react-chips">
      <ChipSet aria-label="React filter chips">
        <FilterChip defaultSelected>Baseline</FilterChip>
        <FilterChip isExpressive>Expressive</FilterChip>
        <FilterChip variant="elevated" isExpressive leadingIcon={<Icon name="home" fill />}>
          Home
        </FilterChip>
        <FilterChip trailingIcon={<Icon name="arrow_drop_down" />}>Sort</FilterChip>
        <FilterChip isDisabled>Disabled</FilterChip>
      </ChipSet>
      <InputChipGroup
        aria-label="React recipients"
        isExpressive
        onRemove={(keys) => {
          setPeople((list) => list.filter((p) => !keys.has(p)));
        }}
      >
        {people.map((p) => (
          <InputChip key={p} id={p} avatar={<Icon name="person" />}>
            {p}
          </InputChip>
        ))}
      </InputChipGroup>
      <ChipSet aria-label="React suggestions">
        <SuggestionChip
          onPress={() => {
            setReply('Sounds good');
          }}
        >
          Sounds good
        </SuggestionChip>
        <SuggestionChip
          variant="elevated"
          icon={<Icon name="chat" />}
          onPress={() => {
            setReply('Reply');
          }}
        >
          Reply
        </SuggestionChip>
      </ChipSet>
      <p aria-live="polite">
        {people.length} recipients; suggestion: {reply}.
      </p>
    </div>
  );
}
