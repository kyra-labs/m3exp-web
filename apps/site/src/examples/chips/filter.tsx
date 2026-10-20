import { ChipSet, FilterChip } from '@kyralabs/m3exp-web/react';

const FILTERS = ['Vegetarian', 'Gluten-free', 'Spicy', 'Under 30 minutes'];

export default function Filter() {
  return (
    <ChipSet aria-label="Recipe filters">
      {FILTERS.map((filter, i) => (
        <FilterChip key={filter} defaultSelected={i === 0} variant={i === 3 ? 'elevated' : 'flat'}>
          {filter}
        </FilterChip>
      ))}
    </ChipSet>
  );
}
