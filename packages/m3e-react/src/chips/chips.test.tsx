import '@kyralabs/m3e-elements/chip-set.js';
import { act, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Icon } from '../icon/Icon.js';
import { canonical, renderElement, renderReact } from '../test/parity.js';
import { ChipSet, FilterChip, InputChip, InputChipGroup, SuggestionChip } from './index.js';

afterEach(() => {
  document.body.innerHTML = '';
});

const pointer = { bubbles: true, button: 0, pointerId: 1, pointerType: 'mouse' };

const press = async (el: Element) => {
  await act(async () => {
    el.dispatchEvent(new PointerEvent('pointerdown', pointer));
    el.dispatchEvent(new PointerEvent('pointerup', pointer));
    (el as HTMLElement).click();
    await Promise.resolve();
  });
};

const key = async (el: Element, k: string) => {
  await act(async () => {
    el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
    el.dispatchEvent(new KeyboardEvent('keyup', { key: k, bubbles: true, cancelable: true }));
    await Promise.resolve();
  });
};

describe('<SuggestionChip>', () => {
  it('renders the m3e-css contract: a button, the icon before the label', async () => {
    const chip = (
      await renderReact(
        <SuggestionChip variant="elevated" icon={<Icon name="lightbulb" />}>
          Try this
        </SuggestionChip>,
      )
    ).querySelector('button')!;
    expect(chip.className).toBe('m3e-suggestion-chip m3e-suggestion-chip--elevated');
    expect(chip.getAttribute('type')).toBe('button');
    expect(chip.hasAttribute('data-ripple')).toBe(true);
    expect([...chip.children].map((c) => c.className)).toEqual([
      'm3e-icon',
      'm3e-suggestion-chip__label',
    ]);
  });

  it('calls onPress; links with href', async () => {
    const onPress = vi.fn();
    const container = await renderReact(
      <>
        <SuggestionChip onPress={onPress}>A</SuggestionChip>
        <SuggestionChip href="/search?q=b">B</SuggestionChip>
      </>,
    );
    await press(container.querySelector('button')!);
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(container.querySelector('a')!.className).toBe('m3e-suggestion-chip');
  });
});

describe('<FilterChip>', () => {
  it('renders a label around a native checkbox; the check is in the leading slot', async () => {
    const container = await renderReact(<FilterChip>Vegan</FilterChip>);
    const label = container.querySelector('label')!;
    expect(label.className).toBe('m3e-filter-chip');
    expect([...label.children].map((c) => c.className)).toEqual([
      'm3e-filter-chip__input',
      'm3e-filter-chip__leading',
      'm3e-filter-chip__label',
    ]);
    const input = label.querySelector('input')!;
    expect(input.type).toBe('checkbox');
    expect(input.checked).toBe(false);
    const check = label.querySelector('.m3e-filter-chip__leading > .m3e-icon')!;
    expect(check.className).toBe('m3e-icon m3e-filter-chip__check');
    expect(check.textContent).toBe('check');
    expect(check.hasAttribute('data-fill')).toBe(true);
    expect(label.querySelector('.m3e-filter-chip__leading')!.getAttribute('aria-hidden')).toBe(
      'true',
    );
    expect(label.hasAttribute('style')).toBe(false);
  });

  it('a press toggles it (the check shows through :checked); onChange', async () => {
    const onChange = vi.fn();
    const container = await renderReact(<FilterChip onChange={onChange}>Vegan</FilterChip>);
    const input = container.querySelector('input')!;
    await act(async () => {
      input.click();
      await Promise.resolve();
    });
    expect(input.checked).toBe(true);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('elevated and expressive modifiers; the expressive corners are sprung inline', async () => {
    const container = await renderReact(
      <FilterChip
        variant="elevated"
        isExpressive
        defaultSelected
        leadingIcon={<Icon name="home" />}
        trailingIcon={<Icon name="arrow_drop_down" />}
      >
        Home
      </FilterChip>,
    );
    const label = container.querySelector('label')!;
    expect(label.className).toBe(
      'm3e-filter-chip m3e-filter-chip--elevated m3e-filter-chip--expressive',
    );
    expect(label.hasAttribute('data-spring')).toBe(true);
    expect(label.querySelector('input')!.checked).toBe(true);
    expect(
      [...label.querySelector('.m3e-filter-chip__leading')!.children].map((c) => c.textContent),
    ).toEqual(['check', 'home']);
    expect(label.lastElementChild!.textContent).toBe('arrow_drop_down');
  });

  it('disabled: the native input is disabled', async () => {
    const container = await renderReact(<FilterChip isDisabled>Off</FilterChip>);
    expect(container.querySelector('input')!.disabled).toBe(true);
  });
});

describe('<InputChipGroup>', () => {
  function People({ onRemove }: { onRemove?: (keys: Set<unknown>) => void }) {
    const [people, setPeople] = useState(['Ada', 'Grace', 'Alan']);
    return (
      <InputChipGroup
        aria-label="Recipients"
        onRemove={(keys) => {
          onRemove?.(keys);
          setPeople((list) => list.filter((p) => !keys.has(p)));
        }}
      >
        {people.map((p) => (
          <InputChip key={p} id={p} avatar={p === 'Ada' ? '/ada.png' : undefined}>
            {p}
          </InputChip>
        ))}
      </InputChipGroup>
    );
  }

  it('renders a grid of rows with a gridcell, the avatar and a remove button', async () => {
    const container = await renderReact(<People />);
    const grid = container.querySelector('.m3e-chip-set')!;
    expect(grid.getAttribute('role')).toBe('grid');
    expect(grid.getAttribute('aria-label')).toBe('Recipients');
    const rows = [...grid.querySelectorAll('.m3e-input-chip')];
    expect(rows.map((r) => r.getAttribute('role'))).toEqual(['row', 'row', 'row']);
    await act(async () => {
      (rows[0] as HTMLElement).focus();
      await Promise.resolve();
    });
    expect(rows.map((r) => r.getAttribute('tabindex'))).toEqual(['0', '-1', '-1']);
    const cell = rows[0]!.firstElementChild!;
    expect(cell.className).toBe('m3e-input-chip__cell');
    expect(cell.getAttribute('role')).toBe('gridcell');
    expect([...cell.children].map((c) => c.className)).toEqual([
      'm3e-input-chip__avatar',
      'm3e-input-chip__label',
      'm3e-input-chip__remove',
    ]);
    const remove = cell.querySelector('button')!;
    expect(remove.getAttribute('tabindex')).toBe('-1');
    expect(remove.getAttribute('aria-label')).toBe('Remove');
    expect(remove.getAttribute('aria-labelledby')).toBe(`${remove.id} ${rows[0]!.id}`);
    expect(rows[0]!.getAttribute('aria-label')).toBe('Ada');
    expect(remove.querySelector('.m3e-icon')!.textContent).toBe('close');
  });

  it('Backspace / Delete remove the focused chip; the remove button too', async () => {
    const onRemove = vi.fn();
    const container = await renderReact(<People onRemove={onRemove} />);
    const rows = () => [...container.querySelectorAll<HTMLElement>('.m3e-input-chip')];
    await act(async () => {
      rows()[1]!.focus();
      await Promise.resolve();
    });
    await key(rows()[1]!, 'Delete');
    expect(onRemove).toHaveBeenLastCalledWith(new Set(['Grace']));
    expect(rows().map((r) => r.getAttribute('aria-label'))).toEqual(['Ada', 'Alan']);
    await key(rows()[0]!, 'Backspace');
    expect(onRemove).toHaveBeenLastCalledWith(new Set(['Ada']));
    await press(rows()[0]!.querySelector('button')!);
    expect(onRemove).toHaveBeenLastCalledWith(new Set(['Alan']));
    expect(rows()).toHaveLength(0);
  });

  it('selectionMode: aria-selected rows; expressive modifier', async () => {
    const container = await renderReact(
      <InputChipGroup
        aria-label="Tags"
        selectionMode="multiple"
        defaultSelectedKeys={['a']}
        isExpressive
      >
        <InputChip id="a">A</InputChip>
        <InputChip id="b" isDisabled>
          B
        </InputChip>
      </InputChipGroup>,
    );
    const rows = [...container.querySelectorAll('.m3e-input-chip')];
    // React Aria: a disabled chip cannot be selected, so it has no aria-selected.
    expect(rows.map((r) => r.getAttribute('aria-selected'))).toEqual(['true', null]);
    expect(rows[1]!.getAttribute('aria-disabled')).toBe('true');
    expect(rows[0]!.className).toBe('m3e-input-chip m3e-input-chip--expressive');
    expect(rows[0]!.querySelector('button')).toBeNull();
  });
});

describe('<ChipSet>', () => {
  it('a group with one tab stop and arrow keys between the chips', async () => {
    const container = await renderReact(
      <ChipSet aria-label="Diet">
        <FilterChip>A</FilterChip>
        <FilterChip isDisabled>B</FilterChip>
        <FilterChip>C</FilterChip>
      </ChipSet>,
    );
    const set = container.querySelector('.m3e-chip-set')!;
    expect(set.getAttribute('role')).toBe('group');
    const inputs = [...set.querySelectorAll('input')];
    expect(inputs.map((i) => i.getAttribute('tabindex'))).toEqual(['0', null, '-1']);
    inputs[0]!.focus();
    await key(inputs[0]!, 'ArrowRight');
    expect(document.activeElement).toBe(inputs[2]);
    // The arrows wrap at the ends, as <InputChipGroup> (React Aria TagGroup) does.
    await key(inputs[2]!, 'ArrowRight');
    expect(document.activeElement).toBe(inputs[0]);
    await key(inputs[0]!, 'ArrowLeft');
    expect(document.activeElement).toBe(inputs[2]);
  });
});

/**
 * The contract both layers render, without React Aria's runtime details: generated ids (the
 * wiring is compared below), press and collection markers, the remove description (React Aria
 * adds it in keyboard modality only; the element always) and the tab stops (React Aria keeps every
 * row and the grid tabbable until focus enters; the element keeps one stop from the start).
 */
const contract = (el: Element) => {
  const clone = el.cloneNode(true) as Element;
  for (const node of [clone, ...clone.querySelectorAll('*')]) {
    for (const name of [
      'data-react-aria-pressable',
      'data-collection',
      'data-key',
      'id',
      'aria-labelledby',
      'aria-describedby',
    ]) {
      node.removeAttribute(name);
    }
    if (node.getAttribute('role') !== null && node.getAttribute('tabindex') !== '-1') {
      node.removeAttribute('tabindex');
    }
    if (node.getAttribute('role') === 'row') node.removeAttribute('tabindex');
  }
  return canonical(clone);
};

describe('element / React DOM parity (CLAUDE.md "Done means" #8)', () => {
  it('input chips: <m3e-chip-set> and <InputChipGroup>', async () => {
    const react = await renderReact(
      <InputChipGroup aria-label="To" onRemove={() => undefined}>
        <InputChip id="ada" avatar="/ada.png">
          Ada
        </InputChip>
        <InputChip id="grace" leadingIcon={<Icon name="mail" />}>
          Grace
        </InputChip>
      </InputChipGroup>,
    );
    const host = await renderElement(
      '<m3e-chip-set label="To">' +
        '<div class="m3e-input-chip" data-value="ada"><div class="m3e-input-chip__cell"><img class="m3e-input-chip__avatar" src="/ada.png" alt=""><span class="m3e-input-chip__label">Ada</span><button class="m3e-input-chip__remove"><span class="m3e-icon" aria-hidden="true">close</span></button></div></div>' +
        '<div class="m3e-input-chip" data-value="grace"><div class="m3e-input-chip__cell"><span class="m3e-icon" aria-hidden="true">mail</span><span class="m3e-input-chip__label">Grace</span><button class="m3e-input-chip__remove"><span class="m3e-icon" aria-hidden="true">close</span></button></div></div>' +
        '</m3e-chip-set>',
    );
    for (const row of host.querySelectorAll('.m3e-input-chip')) {
      row.setAttribute('data-ripple', '');
      row.removeAttribute('data-value');
    }
    expect(contract(host.querySelector('.m3e-chip-set')!)).toBe(
      contract(react.querySelector('.m3e-chip-set')!),
    );
    // Both label the remove button with itself and its row.
    for (const root of [host, react]) {
      const row = root.querySelector('.m3e-input-chip')!;
      const button = row.querySelector('button')!;
      expect(button.getAttribute('aria-labelledby')).toBe(`${button.id} ${row.id}`);
    }
  });

  it('filter chips: <m3e-chip-set> and <ChipSet>', async () => {
    const react = await renderReact(
      <ChipSet aria-label="Diet" singleLine>
        <FilterChip>Vegan</FilterChip>
        <FilterChip defaultSelected>Halal</FilterChip>
      </ChipSet>,
    );
    const chip = (label: string, checked: string) =>
      `<label class="m3e-filter-chip" data-ripple=""><input class="m3e-filter-chip__input" type="checkbox"${checked}><span class="m3e-filter-chip__leading" aria-hidden="true"><span class="m3e-icon m3e-filter-chip__check" data-fill="" aria-hidden="true">check</span></span><span class="m3e-filter-chip__label">${label}</span></label>`;
    const host = await renderElement(
      `<m3e-chip-set label="Diet" single-line>${chip('Vegan', '')}${chip('Halal', ' checked')}</m3e-chip-set>`,
    );
    expect(contract(host.querySelector('.m3e-chip-set')!)).toBe(
      contract(react.querySelector('.m3e-chip-set')!),
    );
  });
});
