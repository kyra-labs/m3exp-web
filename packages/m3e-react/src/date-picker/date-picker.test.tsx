import '@kyralabs/m3e-elements/date-picker.js';
import '@kyralabs/m3e-elements/date-range-picker.js';
import '@kyralabs/m3e-elements/docked-date-picker.js';
import { act, type ReactNode, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { canonical, renderReact } from '../test/parity.js';
import {
  DatePicker,
  DatePickerDialog,
  DateRangePicker,
  DockedDatePicker,
  type YearRange,
} from './index.js';

afterEach(() => {
  document.body.innerHTML = '';
});

const utc = (y: number, m: number, d: number) => Date.UTC(y, m - 1, d);
const day = (root: Element, millis: number) =>
  root.querySelector<HTMLElement>(`.m3e-date-picker__day[data-date="${String(millis)}"]`)!;

/** The date fields' ids count up per page: compare them by position. */
const canonicalIds = (node: Element) => canonical(node).replace(/m3e-date-field-\d+/g, 'field');

async function renderElement(html: string) {
  const container = document.createElement('div');
  container.lang = 'en-US';
  container.innerHTML = html;
  document.body.append(container);
  const host = container.firstElementChild as HTMLElement & { ready: Promise<void> };
  await Promise.resolve();
  await host.ready;
  return host;
}

async function renderReactIn(ui: ReactNode) {
  const container = await renderReact(<div lang="en-US">{ui}</div>);
  return container.firstElementChild!;
}

describe('element / React DOM parity (CLAUDE.md "Done means" #8)', () => {
  it.each<[string, string, ReactNode]>([
    [
      'date picker',
      '<m3e-date-picker value="2025-08-17" year-range="2000-2040"></m3e-date-picker>',
      <DatePicker defaultSelectedDateMillis={utc(2025, 8, 17)} yearRange={[2000, 2040]} />,
    ],
    [
      'date picker, no title, no toggle, a displayed month',
      '<m3e-date-picker displayed-month="2026-02" no-title hide-mode-toggle></m3e-date-picker>',
      <DatePicker displayedMonthMillis={utc(2026, 2, 1)} title={null} showModeToggle={false} />,
    ],
    [
      'range picker',
      '<m3e-date-range-picker start="2025-08-10" end="2025-08-20" displayed-month="2025-08"></m3e-date-range-picker>',
      <DateRangePicker
        defaultSelectedStartDateMillis={utc(2025, 8, 10)}
        defaultSelectedEndDateMillis={utc(2025, 8, 20)}
        displayedMonthMillis={utc(2025, 8, 1)}
      />,
    ],
    [
      'docked',
      '<m3e-docked-date-picker value="2025-08-17" label="Birthday"></m3e-docked-date-picker>',
      <DockedDatePicker defaultSelectedDateMillis={utc(2025, 8, 17)} label="Birthday" />,
    ],
  ])('%s', async (_, html, ui) => {
    const host = await renderElement(html);
    const element = canonicalIds(host.firstElementChild!);
    document.body.innerHTML = '';
    const root = await renderReactIn(ui);
    expect(canonicalIds(root.firstElementChild!)).toBe(element);
  });
});

describe('<DatePicker>', () => {
  it('is controlled: onSelectedDateChange reports the pick, the prop wins', async () => {
    const onChange = vi.fn();
    function App() {
      const [value, setValue] = useState<number | null>(utc(2025, 8, 17));
      return (
        <DatePicker
          selectedDateMillis={value}
          onSelectedDateChange={(v) => {
            onChange(v);
            setValue(v);
          }}
        />
      );
    }
    const root = (await renderReactIn(<App />)).firstElementChild!;
    await act(async () => {
      day(root, utc(2025, 8, 3)).click();
      await Promise.resolve();
    });
    expect(onChange).toHaveBeenCalledWith(utc(2025, 8, 3));
    expect(day(root, utc(2025, 8, 3)).getAttribute('aria-selected')).toBe('true');
    expect(root.querySelector('.m3e-date-picker__headline')!.textContent).toBe('Aug 3, 2025');
  });

  it('keeps its model across renders with an inline year range', async () => {
    let rerender: (range: YearRange) => void = () => undefined;
    function App() {
      const [n, setN] = useState(0);
      rerender = () => {
        setN(n + 1);
      };
      return <DatePicker defaultSelectedDateMillis={utc(2025, 8, 17)} yearRange={[2000, 2040]} />;
    }
    const root = (await renderReactIn(<App />)).firstElementChild!;
    const next = root.querySelectorAll<HTMLButtonElement>('.m3e-date-picker__arrows > button')[1]!;
    await act(async () => {
      next.click();
      await Promise.resolve();
    });
    await act(async () => {
      rerender([2000, 2040]);
      await Promise.resolve();
    });
    expect(root.querySelector('.m3e-date-picker__year-button')!.textContent).toContain(
      'September 2025',
    );
  });

  it('passes root props through and forwards the ref', async () => {
    const ref = vi.fn();
    const root = (
      await renderReactIn(<DatePicker id="dp" data-testid="dp" className="extra" ref={ref} />)
    ).firstElementChild!;
    expect(root.id).toBe('dp');
    expect(root.getAttribute('data-testid')).toBe('dp');
    expect(root.className).toBe('m3e-date-picker extra');
    expect(ref).toHaveBeenCalledWith(root);
  });
});

describe('<DateRangePicker>', () => {
  it('reports the start then the end', async () => {
    const onChange = vi.fn();
    const root = (
      await renderReactIn(
        <DateRangePicker displayedMonthMillis={utc(2025, 8, 1)} onSelectedRangeChange={onChange} />,
      )
    ).firstElementChild!;
    await act(async () => {
      day(root, utc(2025, 8, 4)).click();
      await Promise.resolve();
    });
    expect(onChange).toHaveBeenLastCalledWith(utc(2025, 8, 4), null);
    await act(async () => {
      day(root, utc(2025, 8, 9)).click();
      await Promise.resolve();
    });
    expect(onChange).toHaveBeenLastCalledWith(utc(2025, 8, 4), utc(2025, 8, 9));
  });
});

describe('<DatePickerDialog>', () => {
  it('puts the picker and the actions on the date picker dialog surface', async () => {
    const container = await renderReact(
      <DatePickerDialog
        isOpen
        onOpenChange={() => undefined}
        confirmButton={<button type="button">OK</button>}
        dismissButton={<button type="button">Cancel</button>}
      >
        <DatePicker />
      </DatePickerDialog>,
    );
    const dialog = (container.querySelector('dialog') ?? document.querySelector('dialog'))!;
    const surface = dialog.querySelector('.m3e-date-picker-dialog')!;
    expect(
      surface.querySelector('.m3e-date-picker-dialog__content .m3e-date-picker'),
    ).not.toBeNull();
    expect(
      [...surface.querySelectorAll('.m3e-date-picker-dialog__actions button')].map(
        (b) => b.textContent,
      ),
    ).toEqual(['Cancel', 'OK']);
  });
});
