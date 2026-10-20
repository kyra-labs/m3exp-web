import { afterEach, describe, expect, it, vi } from 'vitest';

// Each `vi.resetModules()` + dynamic import gives a fresh copy of a module, like the element
// entries (dist) and m3e-react (which bundles the layouts from source) on one page (M11 a11y
// audit M2: both docked date pickers made `id="m3e-date-field-1"`).
async function freshCopy<T>(load: () => Promise<T>): Promise<T> {
  vi.resetModules();
  return load();
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('uid (ids unique across bundles)', () => {
  it('counts per prefix on a global shared by every copy of the module', async () => {
    const a = await freshCopy(() => import('./uid.js'));
    const b = await freshCopy(() => import('./uid.js'));
    expect(a.uid).not.toBe(b.uid);
    const first = a.uid('m3e-test');
    const second = b.uid('m3e-test');
    expect(first).toMatch(/^m3e-test-\d+$/);
    expect(second).not.toBe(first);
    expect(a.uid('m3e-other')).toBe('m3e-other-1');
  });

  it('two copies of the date field get distinct input ids and labels', async () => {
    const options = {
      label: 'Date',
      format: {
        patternWithDelimiters: 'MM/dd/yyyy',
        patternWithoutDelimiters: 'MMddyyyy',
        delimiter: '/',
      },
      zeroDigit: '0',
      input: 'singleDateInput',
      validation: () => ({}),
      onSelection: () => undefined,
    } as never;
    const signal = new AbortController().signal;
    const fields = [];
    for (let i = 0; i < 2; i++) {
      const { DateField } = await freshCopy(() => import('../date-picker-layout/field.js'));
      const field = new DateField(document, options, signal);
      document.body.append(field.root);
      fields.push(field);
    }
    const [one, two] = fields.map((f) => f.input.id);
    expect(one).toMatch(/^m3e-date-field-\d+$/);
    expect(two).not.toBe(one);
    const labels = [...document.querySelectorAll('label')].map((l) => l.htmlFor);
    expect(labels).toEqual([one, two]);
    expect(document.querySelectorAll(`[id="${one!}"]`)).toHaveLength(1);
  });

  it('two copies of the chip set layout give their input chips distinct ids', async () => {
    const chips = () => {
      const root = document.createElement('div');
      root.className = 'm3e-chip-set';
      root.innerHTML =
        '<div class="m3e-input-chip"><div class="m3e-input-chip__cell"><span class="m3e-input-chip__label">Chip</span><button class="m3e-input-chip__remove"></button></div></div>';
      document.body.append(root);
      return root;
    };
    const ids = [];
    for (let i = 0; i < 2; i++) {
      const { ChipSetLayout } = await freshCopy(
        () => import('../chip-set-layout/chip-set-layout.js'),
      );
      const root = chips();
      new ChipSetLayout(root).update();
      ids.push(root.querySelector('.m3e-input-chip')!.id);
    }
    expect(ids[0]).toMatch(/^m3e-chip-set-\d+-Chip$/);
    expect(ids[1]).not.toBe(ids[0]);
  });
});
