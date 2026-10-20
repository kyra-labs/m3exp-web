import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';

// Date pickers (COMPONENT_SPEC §27): <m3e-date-picker> (calendar, input, selectable dates),
// <m3e-date-range-picker> (month list, input), <m3e-docked-date-picker>, the dialogs (element
// and React). Acceptance (the APG grid keys, month paging by arrows, keys and swipes, the year
// grid, Compose's input validation, range selection, the docked drop-down, the dialogs' results)
// + light/dark × 3 browsers baselines at rest and in the hover / focus / error / open states,
// axe, geometry against DatePickerModalTokens and DatePicker.kt, forced colors, reduced motion.
// The clock is fixed on Thursday 2025-08-14 so "today" is the same in every run.
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
const TODAY = new Date('2025-08-14T12:00:00');
const utc = (y: number, m: number, d: number) => Date.UTC(y, m - 1, d);

const box = async (el: Locator) => (await el.boundingBox())!;
const token = (page: Page, name: string) =>
  page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
const px = async (page: Page, name: string) => Number.parseFloat(await token(page, name));
/** The figure around a picker (the element itself is `display: contents`). */
const figure = (page: Page, id: string) => page.locator('figure', { has: page.getByTestId(id) });
const root = (page: Page, id: string) => page.getByTestId(id).locator('> div');
const day = (scope: Locator, millis: number) =>
  scope.locator(`.m3e-date-picker__day[data-date="${String(millis)}"]`);
const yearButton = (scope: Locator) => scope.locator('.m3e-date-picker__year-button');
/** Waits for the page's animations (a dialog opening, a month sliding) to finish. */
const settle = (page: Page) =>
  page.evaluate(() =>
    // A replaced animation rejects `finished` (WebKit): it is over too.
    Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined))),
  );

/** Records the element's `change` events. */
const recordChanges = (page: Page, id: string) =>
  page.getByTestId(id).evaluate((node) => {
    const w = window as unknown as { changes: unknown[] };
    w.changes = [];
    node.addEventListener('change', (e) => {
      w.changes.push((e as CustomEvent).detail);
    });
  });
const changes = (page: Page) =>
  page.evaluate(() => (window as unknown as { changes: unknown[] }).changes);

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(TODAY);
  await page.goto('/components/date-picker/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('m3e-date-picker .m3e-date-picker__calendar')).toHaveCount(3);
  await expect(page.locator('m3e-date-range-picker .m3e-date-picker__range-month')).not.toHaveCount(
    0,
  );
  await expect(page.locator('m3e-date-picker[display-mode="input"] input')).toHaveCount(1);
  await expect(page.getByTestId('react-picker').locator('.m3e-date-picker__calendar')).toHaveCount(
    1,
  );
});

test('has no axe violations', async ({ page }) => {
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  expect(results.violations).toEqual([]);
});

test('has no axe violations with the year grid, the docked calendar and each dialog open', async ({
  page,
}) => {
  const check = async (what: string) => {
    await settle(page);
    const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
    expect(results.violations, what).toEqual([]);
  };
  await yearButton(root(page, 'picker')).click();
  await check('year grid');
  await page.keyboard.press('Escape');
  await page.getByTestId('docked').locator('.m3e-text-field__trailing button').click();
  await check('docked');
  await page.keyboard.press('Escape');
  for (const [open, dialog] of [
    ['open-dialog', 'dialog'],
    ['open-dialog-range', 'dialog-range'],
  ] as const) {
    await page.getByTestId(open).click();
    await expect(page.getByTestId(dialog).locator('dialog')).toBeVisible();
    await check(dialog);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId(dialog).locator('dialog')).toBeHidden();
  }
  await page.getByTestId('react-open-dialog').click();
  await expect(page.locator('dialog[open] .m3e-date-picker-dialog')).toBeVisible();
  await check('React dialog');
});

test.describe('baselines', () => {
  for (const id of ['picker', 'input', 'selectable', 'range', 'range-input'] as const) {
    test(`${id} at rest`, async ({ page }) => {
      await expect(figure(page, id)).toHaveScreenshot(`${id}.png`);
    });
  }

  test('calendar: hovered day and focused day (keyboard)', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const picker = root(page, 'picker');
    await day(picker, utc(2025, 8, 20)).hover();
    await expect(figure(page, 'picker')).toHaveScreenshot('picker-hover.png');
    await page.mouse.move(0, 0);
    await day(picker, utc(2025, 8, 17)).focus();
    await page.keyboard.press('ArrowRight');
    await expect(day(picker, utc(2025, 8, 18))).toBeFocused();
    await expect(day(picker, utc(2025, 8, 18))).toHaveCSS('outline-style', 'solid');
    await expect(figure(page, 'picker')).toHaveScreenshot('picker-focus.png');
  });

  test('year grid open', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await yearButton(root(page, 'picker')).click();
    await settle(page);
    await expect(figure(page, 'picker')).toHaveScreenshot('picker-years.png');
  });

  test('input: invalid date', async ({ page }) => {
    const input = root(page, 'input').locator('input');
    await input.fill('');
    await input.pressSequentially('13452025');
    await expect(root(page, 'input').locator('[role="alert"]')).toBeVisible();
    await input.blur();
    await expect(figure(page, 'input')).toHaveScreenshot('input-error.png');
  });

  test('docked: closed and open', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const docked = page.locator('.docs-date-docked', { has: page.getByTestId('docked') });
    await expect(docked).toHaveScreenshot('docked.png');
    await page.getByTestId('docked').locator('.m3e-text-field__trailing button').click();
    await expect(docked).toHaveScreenshot('docked-open.png');
    await root(page, 'docked').locator('.m3e-date-picker__menu-button').first().click();
    await expect(docked).toHaveScreenshot('docked-months.png');
  });

  test('dialogs open', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.getByTestId('open-dialog').click();
    await settle(page);
    await expect(page.getByTestId('dialog').locator('.m3e-date-picker-dialog')).toHaveScreenshot(
      'dialog.png',
    );
    await page.keyboard.press('Escape');
    await page.setViewportSize({ width: 412, height: 800 });
    await page.getByTestId('open-dialog-range').click();
    await settle(page);
    await expect(page).toHaveScreenshot('dialog-range-compact.png');
  });
});

test.describe('geometry (DatePickerModalTokens, DatePicker.kt)', () => {
  test('container, header and the 40dp days in 48dp cells', async ({ page }) => {
    const picker = root(page, 'picker');
    expect((await box(picker)).width).toBe(
      await px(page, '--m3e-comp-date-picker-modal-container-width'),
    );
    const size = await px(page, '--m3e-comp-date-picker-modal-date-container-width');
    const cell = await px(page, '--m3e-comp-date-picker-cell-size');
    const a = await box(day(picker, utc(2025, 8, 3)));
    const b = await box(day(picker, utc(2025, 8, 4)));
    const c = await box(day(picker, utc(2025, 8, 10)));
    expect(a.width).toBe(size);
    expect(a.height).toBe(size);
    expect(b.x - a.x).toBe(cell);
    expect(c.y - a.y).toBe(cell);
    // The touch target: the day's ::after covers the whole 48dp cell.
    const target = await day(picker, utc(2025, 8, 3)).evaluate((node) => {
      const after = getComputedStyle(node, '::after');
      return [after.width, after.height].map(Number.parseFloat);
    });
    expect(target).toEqual([cell, cell]);
    // The month / year row (MonthYearHeight 56dp) and its 48dp arrows.
    const nav = await box(picker.locator('.m3e-date-picker__nav'));
    expect(nav.height).toBe(await px(page, '--m3e-comp-date-picker-month-year-height'));
    // The arrows: 40dp icon buttons with the ::after touch target.
    for (const arrow of await picker.locator('.m3e-date-picker__arrows > button').all()) {
      const target = await arrow.evaluate((node) => {
        const after = getComputedStyle(node, '::after');
        return Math.min(Number.parseFloat(after.width), Number.parseFloat(after.height));
      });
      expect(target).toBeGreaterThanOrEqual(48);
    }
  });

  test('the year grid: three years a row, 72 × 36 containers', async ({ page }) => {
    const picker = root(page, 'picker');
    await yearButton(picker).click();
    await settle(page);
    const years = picker.locator('.m3e-date-picker__year');
    const selected = picker.locator('.m3e-date-picker__year[aria-selected="true"]');
    await expect(selected).toHaveText('2025');
    await expect(selected).toBeFocused();
    const a = await box(years.nth(0));
    const b = await box(years.nth(1));
    const d = await box(years.nth(3));
    expect(d.x).toBeCloseTo(a.x, 0);
    expect(b.y).toBeCloseTo(a.y, 0);
    expect(d.y).toBeGreaterThan(a.y);
    const container = await selected.evaluate((node) => {
      const s = getComputedStyle(node, '::before');
      return [s.width, s.height].map(Number.parseFloat);
    });
    expect(container).toEqual([
      await px(page, '--m3e-comp-date-picker-modal-selection-year-container-width'),
      await px(page, '--m3e-comp-date-picker-modal-selection-year-container-height'),
    ]);
  });

  test('the range band joins the selected days', async ({ page }) => {
    const range = root(page, 'range');
    const bands = range.locator('.m3e-date-picker__band');
    await expect(bands).toHaveCount(2);
    const start = await box(day(range, utc(2025, 8, 10)));
    // The bands are prepended: the first row's is the topmost, not the first in the DOM.
    const rows = await Promise.all((await bands.all()).map(box));
    const band = rows.reduce((a, b) => (a.y < b.y ? a : b));
    expect(band.height).toBe(
      await px(
        page,
        '--m3e-comp-date-picker-modal-range-selection-active-indicator-container-height',
      ),
    );
    expect(band.y + band.height / 2).toBeCloseTo(start.y + start.height / 2, 0);
  });
});

test.describe('behavior', () => {
  test('a click picks a day; the headline follows', async ({ page }) => {
    await recordChanges(page, 'picker');
    const picker = root(page, 'picker');
    await day(picker, utc(2025, 8, 5)).click();
    expect(await changes(page)).toEqual([{ value: '2025-08-05' }]);
    await expect(picker.locator('.m3e-date-picker__headline')).toHaveText('Aug 5, 2025');
    await expect(day(picker, utc(2025, 8, 5))).toHaveAttribute('aria-selected', 'true');
    // Today (the fixed clock) is marked.
    await expect(day(picker, utc(2025, 8, 14))).toHaveAttribute('aria-current', 'date');
  });

  test('the grid keys: arrows, Page Down across months, Enter picks', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await recordChanges(page, 'picker');
    const picker = root(page, 'picker');
    await day(picker, utc(2025, 8, 30)).focus();
    await page.keyboard.press('ArrowRight');
    await expect(day(picker, utc(2025, 8, 31))).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(yearButton(picker)).toContainText('September 2025');
    await expect(day(picker, utc(2025, 9, 1))).toBeFocused();
    await page.keyboard.press('PageDown');
    await expect(day(picker, utc(2025, 10, 1))).toBeFocused();
    await page.keyboard.press('Shift+PageUp');
    await expect(day(picker, utc(2024, 10, 1))).toBeFocused();
    await page.keyboard.press('Enter');
    expect(await changes(page)).toEqual([{ value: '2024-10-01' }]);
  });

  test('the arrows page on the month spring, and jump with reduced motion', async ({ page }) => {
    const picker = root(page, 'picker');
    const next = picker.locator('.m3e-date-picker__arrows > button').nth(1);
    await next.click();
    await expect(yearButton(picker)).toContainText('September 2025');
    // Mid-slide, the outgoing page is still there.
    await expect(picker.locator('.m3e-date-picker__month')).toHaveCount(2);
    await expect(picker.locator('.m3e-date-picker__month')).toHaveCount(1);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await next.click();
    await expect(yearButton(picker)).toContainText('October 2025');
    expect(await picker.locator('.m3e-date-picker__month').count()).toBe(1);
  });

  test('a touch swipe pages one month', async ({ page }) => {
    const picker = root(page, 'picker');
    const viewport = picker.locator('.m3e-date-picker__viewport');
    const r = await box(viewport);
    await viewport.evaluate(
      (node, { x, y }) => {
        node.setPointerCapture = () => undefined;
        const fire = (type: string, dx: number, t: number) => {
          node.dispatchEvent(
            new PointerEvent(type, {
              bubbles: true,
              cancelable: true,
              pointerId: 7,
              pointerType: 'touch',
              isPrimary: true,
              clientX: x + dx,
              clientY: y,
              timeStamp: t,
            } as PointerEventInit),
          );
        };
        fire('pointerdown', 0, 0);
        for (let i = 1; i <= 10; i++) fire('pointermove', -20 * i, i * 8);
        fire('pointerup', -200, 90);
      },
      { x: r.x + r.width - 20, y: r.y + r.height / 2 },
    );
    await expect(yearButton(picker)).toContainText('September 2025');
  });

  test('the year grid picks a year and returns to the calendar', async ({ page }) => {
    const picker = root(page, 'picker');
    await yearButton(picker).click();
    await expect(yearButton(picker)).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(yearButton(picker)).toHaveAttribute('aria-expanded', 'false');
    await expect(yearButton(picker)).toContainText('August 2028');
    await expect(yearButton(picker)).toBeFocused();
  });

  test('selectable dates: weekends and years before 2022 are disabled', async ({ page }) => {
    const picker = root(page, 'selectable');
    await expect(day(picker, utc(2025, 8, 16))).toHaveAttribute('aria-disabled', 'true');
    await expect(day(picker, utc(2025, 8, 15))).not.toHaveAttribute('aria-disabled', 'true');
    await recordChanges(page, 'selectable');
    await day(picker, utc(2025, 8, 16)).click({ force: true });
    expect(await changes(page)).toEqual([]);
    await yearButton(picker).click();
    await expect(picker.locator('.m3e-date-picker__year', { hasText: '2021' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  test('the input: the mode toggle, typing a date, the year range error', async ({ page }) => {
    await recordChanges(page, 'picker');
    const picker = root(page, 'picker');
    await picker.locator('.m3e-date-picker__mode-toggle').click();
    const input = picker.locator('input');
    await expect(input).toHaveValue('08/17/2025');
    await expect(input).toHaveAttribute('placeholder', 'MM/DD/YYYY');
    await input.fill('');
    // Compose's transformations (owner decision M10 D5): digits only, the delimiters shown as
    // they come.
    await input.pressSequentially('03-15-2024');
    await expect(input).toHaveValue('03/15/2024');
    expect((await changes(page)).at(-1)).toEqual({ value: '2024-03-15' });
    await input.fill('');
    await input.pressSequentially('01011800');
    await expect(picker.locator('[role="alert"]')).toHaveText(
      'Date out of expected year range 1900 - 2100',
    );
  });

  test('the range: start, end, the band and the headline', async ({ page }) => {
    await recordChanges(page, 'range');
    const range = root(page, 'range');
    await day(range, utc(2025, 8, 4)).click();
    await day(range, utc(2025, 8, 8)).click();
    expect(await changes(page)).toEqual([
      { start: '2025-08-04', end: null },
      { start: '2025-08-04', end: '2025-08-08' },
    ]);
    await expect(range.locator('.m3e-date-picker__headline')).toHaveText('Aug 4, 2025-Aug 8, 2025');
    await expect(day(range, utc(2025, 8, 6))).toHaveAttribute('data-in-range', '');
    await expect(range.locator('.m3e-date-picker__band')).toHaveCount(1);
  });

  test('docked: the calendar drops down, a pick fills the field, Escape closes', async ({
    page,
  }) => {
    await recordChanges(page, 'docked');
    const docked = root(page, 'docked');
    const popup = docked.locator('.m3e-date-picker--docked');
    await docked.locator('.m3e-text-field__trailing button').click();
    await expect(popup).toBeVisible();
    await expect(day(popup, utc(2025, 8, 17))).toBeFocused();
    await day(popup, utc(2025, 8, 21)).click();
    await expect(popup).toBeHidden();
    await expect(docked.locator('input')).toHaveValue('08/21/2025');
    expect(await changes(page)).toEqual([{ value: '2025-08-21' }]);
    await docked.locator('.m3e-text-field__trailing button').click();
    await page.keyboard.press('Escape');
    await expect(popup).toBeHidden();
  });

  test('dialogs: OK reports the picked date, Save the range', async ({ page }) => {
    await page.getByTestId('open-dialog').click();
    const dialog = page.getByTestId('dialog');
    await day(dialog, utc(2025, 8, 26)).click();
    await page.getByTestId('dialog-ok').click();
    await expect(page.getByTestId('dialog-result')).toHaveText('2025-08-26');
    await page.getByTestId('open-dialog-range').click();
    await page.getByTestId('dialog-range-save').click();
    await expect(page.getByTestId('dialog-result')).toHaveText('2025-08-10 – 2025-08-20');
  });

  test('React: the dialog, the full-screen range and the docked picker', async ({ page }) => {
    await page.getByTestId('react-open-dialog').click();
    const open = page.locator('dialog[open]');
    await day(open, utc(2025, 8, 5)).click();
    await open.getByRole('button', { name: 'OK' }).click();
    await expect(page.getByTestId('react-value')).toHaveText('2025-08-05');
    await page.getByTestId('react-open-range').click();
    await day(open, utc(2025, 8, 3)).click();
    await day(open, utc(2025, 8, 7)).click();
    await open.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByTestId('react-range')).toHaveText('2025-08-03 – 2025-08-07');
    // The dialog's exit motion keeps the page inert until it ends.
    await expect(page.locator('dialog[open]')).toHaveCount(0);
    const docked = page.getByTestId('react-docked-picker');
    // The calendar icon is the only way into the calendar: a click on the field types.
    await docked.locator('input').click();
    await expect(docked.locator('.m3e-date-picker--docked')).toBeHidden();
    await docked.locator('input').pressSequentially('08142025');
    await expect(page.getByTestId('react-docked')).toHaveText('2025-08-14');
  });
});

test('forced colors: the selection and today stay visible', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'forced-colors emulation is Chromium only');
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  await expect(figure(page, 'picker')).toHaveScreenshot('picker-forced-colors.png');
  await expect(figure(page, 'range')).toHaveScreenshot('range-forced-colors.png');
});
