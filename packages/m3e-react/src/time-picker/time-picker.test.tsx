import '@kyralabs/m3e-elements/time-input.js';
import '@kyralabs/m3e-elements/time-picker.js';
import '@kyralabs/m3e-elements/time-scroll.js';
import { act, type ReactNode, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { canonical, renderElement, renderReact } from '../test/parity.js';
import {
  TimeInput,
  TimePicker,
  TimePickerDialog,
  TimePickerModeToggle,
  TimeScroll,
  type TimeValue,
  VibrantTimePickerDialog,
} from './index.js';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('element / React DOM parity (CLAUDE.md "Done means" #8)', () => {
  it.each<[string, string, ReactNode]>([
    [
      'dial, 12-hour',
      '<m3e-time-picker hour="14" minute="23" hour-cycle="12" layout="vertical"></m3e-time-picker>',
      <TimePicker defaultValue={{ hour: 14, minute: 23 }} is24Hour={false} layout="vertical" />,
    ],
    [
      'dial, vibrant 24-hour horizontal, minutes',
      '<m3e-time-picker hour="7" minute="41" hour-cycle="24" vibrant layout="horizontal" selection="minute"></m3e-time-picker>',
      <TimePicker
        defaultValue={{ hour: 7, minute: 41 }}
        is24Hour
        vibrant
        layout="horizontal"
        defaultSelection="minute"
      />,
    ],
    [
      'input, 12-hour',
      '<m3e-time-input hour="9" minute="5" hour-cycle="12"></m3e-time-input>',
      <TimeInput defaultValue={{ hour: 9, minute: 5 }} is24Hour={false} />,
    ],
    [
      'input, uncontained 24-hour',
      '<m3e-time-input hour="21" minute="0" hour-cycle="24" uncontained></m3e-time-input>',
      <TimeInput defaultValue={{ hour: 21, minute: 0 }} is24Hour uncontained />,
    ],
    [
      'scroll, uncontained 12-hour',
      '<m3e-time-scroll hour="18" minute="30" hour-cycle="12" uncontained></m3e-time-scroll>',
      <TimeScroll defaultValue={{ hour: 18, minute: 30 }} is24Hour={false} uncontained />,
    ],
  ])('%s', async (_, html, ui) => {
    const host = await renderElement(html);
    const element = canonical(host.firstElementChild!);
    document.body.innerHTML = '';
    const container = await renderReact(ui);
    expect(canonical(container.firstElementChild!)).toBe(element);
  });
});

describe('<TimePicker>', () => {
  it('is controlled: onChange reports the AM/PM switch, the value prop wins', async () => {
    const onChange = vi.fn();
    function App() {
      const [value, setValue] = useState<TimeValue>({ hour: 9, minute: 15 });
      return (
        <TimePicker
          value={value}
          is24Hour={false}
          layout="vertical"
          onChange={(v) => {
            onChange(v);
            setValue(v);
          }}
        />
      );
    }
    const container = await renderReact(<App />);
    const pm = container.querySelectorAll<HTMLButtonElement>('.m3e-time-picker__period-item')[1]!;
    await act(async () => {
      pm.click();
      await Promise.resolve();
    });
    expect(onChange).toHaveBeenCalledWith({ hour: 21, minute: 15 });
    expect(pm.getAttribute('aria-checked')).toBe('true');
  });

  it('passes className and other props to the root', async () => {
    const container = await renderReact(
      <TimePicker className="extra" id="tp" aria-describedby="hint" is24Hour layout="vertical" />,
    );
    const root = container.firstElementChild!;
    expect(root.className).toBe('m3e-time-picker m3e-time-picker--24h extra');
    expect(root.id).toBe('tp');
    expect(root.getAttribute('aria-describedby')).toBe('hint');
  });
});

describe('<TimeInput> / <TimeScroll>', () => {
  it('onModeToggle from the uncontained side column', async () => {
    const onModeToggle = vi.fn();
    const container = await renderReact(
      <TimeScroll uncontained is24Hour onModeToggle={onModeToggle} />,
    );
    const toggle = container.querySelector<HTMLButtonElement>('.m3e-time-picker__side button')!;
    expect(toggle.getAttribute('aria-label')).toBe('Switch to text input mode');
    toggle.click();
    expect(onModeToggle).toHaveBeenCalledOnce();
  });

  it('onSelectionChange when a field is focused', async () => {
    const onSelectionChange = vi.fn();
    const container = await renderReact(
      <TimeInput is24Hour onSelectionChange={onSelectionChange} />,
    );
    await act(async () => {
      container.querySelectorAll('input')[1]!.focus();
      await Promise.resolve();
    });
    expect(onSelectionChange).toHaveBeenCalledWith('minute');
  });
});

describe('<TimePickerDialog> / <VibrantTimePickerDialog>', () => {
  it('renders the dialog surface contract inside a custom m3e-dialog', async () => {
    const container = await renderReact(
      <TimePickerDialog
        defaultOpen
        title="Select Time"
        modeToggleButton={
          <TimePickerModeToggle displayMode="picker" onDisplayModeChange={() => undefined} />
        }
        dismissButton={<button type="button">Cancel</button>}
        confirmButton={<button type="button">OK</button>}
      >
        <TimePicker is24Hour layout="vertical" />
      </TimePickerDialog>,
    );
    const dialog = container.querySelector('dialog')!;
    expect(dialog.className).toBe('m3e-dialog m3e-dialog--custom');
    const surface = dialog.querySelector('.m3e-dialog__container > .m3e-time-picker-dialog')!;
    const title = surface.querySelector('.m3e-time-picker-dialog__title')!;
    expect(title.textContent).toBe('Select Time');
    expect(dialog.getAttribute('aria-labelledby')).toBe(title.id);
    const actions = surface.querySelector('.m3e-time-picker-dialog__actions')!;
    expect([...actions.children].map((c) => c.className || c.tagName)).toEqual([
      expect.stringContaining('m3e-icon-button'),
      'm3e-tooltip',
      'm3e-time-picker-dialog__spacer',
      'BUTTON',
      'BUTTON',
    ]);
    expect(actions.querySelector('.m3e-icon-button')!.getAttribute('aria-label')).toBe(
      'Switch to text input mode',
    );
  });

  it('vibrant: no title, the vibrant surface', async () => {
    const container = await renderReact(
      <VibrantTimePickerDialog defaultOpen confirmButton={<button type="button">OK</button>}>
        <TimeScroll is24Hour />
      </VibrantTimePickerDialog>,
    );
    const surface = container.querySelector('.m3e-time-picker-dialog')!;
    expect(surface.className).toBe('m3e-time-picker-dialog m3e-time-picker-dialog--vibrant');
    expect(surface.querySelector('.m3e-time-picker-dialog__title')).toBeNull();
  });
});
