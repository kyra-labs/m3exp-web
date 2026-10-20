import { useState } from 'react';
import { InputChip, InputChipGroup } from '@kyralabs/m3exp-web/react';

const PEOPLE = [
  { id: 'ada', name: 'Ada Lovelace' },
  { id: 'grace', name: 'Grace Hopper' },
  { id: 'alan', name: 'Alan Turing' },
];

export default function Input() {
  const [people, setPeople] = useState(PEOPLE);
  return (
    <InputChipGroup
      aria-label="Recipients"
      onRemove={(keys) => {
        setPeople((list) => list.filter((p) => !keys.has(p.id)));
      }}
    >
      {people.map((person) => (
        <InputChip
          key={person.id}
          id={person.id}
          avatar={<span aria-hidden="true">{person.name.charAt(0)}</span>}
        >
          {person.name}
        </InputChip>
      ))}
    </InputChipGroup>
  );
}
