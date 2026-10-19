import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';

// Time pickers (COMPONENT_SPEC §28): <m3e-time-picker> (12 / 24-hour vibrant / horizontal),
// <m3e-time-input> (12-hour, 24-hour vibrant, uncontained), <m3e-time-scroll> (12-hour, 24-hour
// uncontained), the dialogs (element and React). Acceptance (dial taps and keys with the auto
// switch to minutes, Compose's input transformation and errors, the wheels as spin buttons, the
// dialogs' results) + light/dark × 3 browsers baselines at rest and in the hover / focus / error /
// open states, axe, geometry against TimePickerTokens and TimePicker.kt, forced colors, reduced
// motion.
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
const PICKERS = [
  'dial-12h',
  'dial-24h-vibrant',
  'dial-horizontal',
  'input-12h',
  'input-24h-vibrant',
  'input-uncontained',
  'scroll-12h',
  'scroll-24h-uncontained',
] as const;

const box = async (el: Locator) => (await el.boundingBox())!;
const token = (page: Page, name: string) =>
  page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
const px = async (page: Page, name: string) => Number.parseFloat(await token(page, name));
/** The figure around a picker (the element itself is `display: contents`). */
const figure = (page: Page, id: string) => page.locator('figure', { has: page.getByTestId(id) });
const root = (page: Page, id: string) => page.getByTestId(id).locator('> div');
/** A dial label by its text in the active face (of a picker, or of the picker in a dialog). */
const label = (page: Page, id: string, text: string) =>
  page
    .getByTestId(id)
    .locator(
      '.m3e-time-picker__dial > .m3e-time-picker__face[data-active] > .m3e-time-picker__label',
    )
    .getByText(text, { exact: true });
/** Waits for the page's animations (a dialog opening) to finish. */
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
  await page.goto('/components/time-picker/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('m3e-time-picker .m3e-time-picker__dial')).toHaveCount(4);
  await expect(page.locator('m3e-time-scroll .m3e-time-scroll__fields')).toHaveCount(3);
  await expect(page.getByTestId('react-time-pickers').locator('.m3e-time-input')).toHaveCount(1);
});

test('has no axe violations', async ({ page }) => {
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  expect(results.violations).toEqual([]);
});

test('has no axe violations with each dialog open', async ({ page }) => {
  for (const [open, dialog] of [
    ['open-dialog', 'dialog'],
    ['open-dialog-vibrant', 'dialog-vibrant'],
  ] as const) {
    await page.getByTestId(open).click();
    await expect(page.getByTestId(dialog).locator('dialog')).toBeVisible();
    await settle(page);
    const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
    expect(results.violations, dialog).toEqual([]);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId(dialog).locator('dialog')).toBeHidden();
  }
  await page.getByTestId('react-open-dialog').click();
  await expect(page.locator('dialog[open] .m3e-time-picker-dialog')).toBeVisible();
  await settle(page);
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  expect(results.violations).toEqual([]);
});

test.describe('baselines', () => {
  for (const id of PICKERS) {
    test(`${id} at rest`, async ({ page }) => {
      await expect(figure(page, id)).toHaveScreenshot(`${id}.png`);
    });
  }

  test('dial: hovered label and focused hour (keyboard)', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await label(page, 'dial-12h', '3').hover();
    await expect(figure(page, 'dial-12h')).toHaveScreenshot('dial-12h-hover.png');
    await page.mouse.move(0, 0);
    // Arrow keys move focus only (Enter picks): there and back leaves 9 focused from the keyboard.
    await label(page, 'dial-12h', '9').focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowLeft');
    await expect(label(page, 'dial-12h', '9')).toBeFocused();
    // The selected label is under the handle: the handle shows the ring.
    await expect(root(page, 'dial-12h').locator('.m3e-time-picker__handle')).toHaveCSS(
      'outline-style',
      'solid',
    );
    await expect(figure(page, 'dial-12h')).toHaveScreenshot('dial-12h-focus.png');
    // Another label shows its own ring.
    await page.keyboard.press('ArrowRight');
    await expect(label(page, 'dial-12h', '10')).toHaveCSS('outline-style', 'solid');
    await expect(root(page, 'dial-12h').locator('.m3e-time-picker__handle')).toHaveCSS(
      'outline-style',
      'none',
    );
  });

  test('dial: PM selected and the minutes face', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await root(page, 'dial-12h').locator('.m3e-time-picker__period-item').nth(1).click();
    await root(page, 'dial-12h').locator('.m3e-time-picker__selector').nth(1).click();
    await expect(root(page, 'dial-12h')).toHaveAttribute('data-selection', 'minute');
    await page.mouse.move(0, 0);
    await expect(figure(page, 'dial-12h')).toHaveScreenshot('dial-12h-pm-minutes.png');
  });

  test('input: focused minute field and an invalid hour', async ({ page }) => {
    const fields = root(page, 'input-12h').locator('input');
    await fields.nth(1).focus();
    await expect(figure(page, 'input-12h')).toHaveScreenshot('input-12h-focus.png');
    await fields.nth(0).focus();
    await fields.nth(0).selectText();
    await page.keyboard.type('13');
    await expect(fields.nth(0)).toHaveAttribute('aria-invalid', 'true');
    await expect(figure(page, 'input-12h')).toHaveScreenshot('input-12h-error.png');
  });

  test('scroll: focused wheel', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await root(page, 'scroll-12h').locator('.m3e-time-scroll__field').first().focus();
    await page.keyboard.press('ArrowDown');
    await expect(root(page, 'scroll-12h').locator('[role="spinbutton"]').first()).toHaveAttribute(
      'aria-valuenow',
      '7',
    );
    await expect(figure(page, 'scroll-12h')).toHaveScreenshot('scroll-12h-focus.png');
  });

  test('dialogs open', async ({ page, browserName }) => {
    // WebKit anti-aliases the surface's rounded corners over the scrim a little differently from
    // run to run (≤ 50 px at the corners).
    const corners = { maxDiffPixels: browserName === 'webkit' ? 80 : 0 };
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.getByTestId('open-dialog').click();
    const dialog = page.getByTestId('dialog').locator('.m3e-time-picker-dialog');
    await expect(dialog).toBeVisible();
    await settle(page);
    await expect(dialog).toHaveScreenshot('dialog.png', corners);
    await page.keyboard.press('Escape');
    await page.getByTestId('open-dialog-vibrant').click();
    const vibrant = page.getByTestId('dialog-vibrant').locator('.m3e-time-picker-dialog');
    await expect(vibrant).toBeVisible();
    await settle(page);
    await expect(vibrant).toHaveScreenshot('dialog-vibrant.png', corners);
  });
});

test.describe('geometry (TimePickerTokens, TimePicker.kt)', () => {
  test('the dial, its labels and the selector', async ({ page }) => {
    const size = await px(page, '--m3e-comp-time-picker-clock-dial-container-size');
    const labelSize = await px(page, '--m3e-comp-time-picker-minimum-interactive-size');
    const outer = await px(page, '--m3e-comp-time-picker-outer-radius');
    const inner = await px(page, '--m3e-comp-time-picker-inner-radius');
    // Compose: ClockDialContainerSize 256dp, labels on 101dp / 69dp radii (OuterCircleSizeRadius,
    // InnerCircleRadius), 48dp label boxes.
    expect([size, outer, inner, labelSize]).toEqual([256, 101, 69, 48]);
    const dial = await box(root(page, 'dial-12h').locator('.m3e-time-picker__dial'));
    expect([dial.width, dial.height]).toEqual([size, size]);
    const twelve = await box(label(page, 'dial-12h', '12'));
    expect(twelve.width).toBeCloseTo(labelSize, 0);
    expect(twelve.x + twelve.width / 2 - dial.x).toBeCloseTo(size / 2, 0);
    expect(dial.y + size / 2 - (twelve.y + twelve.height / 2)).toBeCloseTo(outer, 0);
    const three = await box(label(page, 'dial-12h', '3'));
    expect(three.x + three.width / 2 - (dial.x + size / 2)).toBeCloseTo(outer, 0);
    // 24-hour: the inner circle (13–23, 00).
    const minutes = root(page, 'dial-24h-vibrant');
    await minutes.locator('.m3e-time-picker__selector').first().click();
    const dial24 = await box(minutes.locator('.m3e-time-picker__dial'));
    const fifteen = await box(label(page, 'dial-24h-vibrant', '15'));
    expect(fifteen.x + fifteen.width / 2 - (dial24.x + size / 2)).toBeCloseTo(inner, 0);
    // The selector handle sits on the selected value (9 o'clock for 9).
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const handle = await box(root(page, 'dial-12h').locator('.m3e-time-picker__handle'));
    expect(handle.width).toBeCloseTo(
      await px(page, '--m3e-comp-time-picker-clock-dial-selector-handle-container-size'),
      0,
    );
    expect(dial.x + size / 2 - (handle.x + handle.width / 2)).toBeCloseTo(outer, 0);
  });

  test('the handle shows the selected value in on-primary (drawSelector)', async ({ page }) => {
    const copy = root(page, 'dial-12h').locator(
      '.m3e-time-picker__highlight > [data-active] > [data-label="9"]',
    );
    const after = await copy.evaluate((node) => {
      const style = getComputedStyle(node, '::after');
      return { content: style.content, color: style.color };
    });
    const onPrimary = await page.evaluate(() => {
      const probe = document.createElement('span');
      probe.style.color = 'var(--m3e-comp-time-picker-clock-dial-label-text-color-selected)';
      document.body.append(probe);
      const color = getComputedStyle(probe).color;
      probe.remove();
      return color;
    });
    expect(after).toEqual({ content: '"9"', color: onPrimary });
  });

  test('the side column: AM, PM 8dp below, the toggle icon 16dp below PM (SideControlColumn)', async ({
    page,
  }) => {
    const side = root(page, 'input-uncontained').locator('.m3e-time-picker__side');
    const field = await box(root(page, 'input-uncontained').locator('input').first());
    const [am, pm] = [
      await box(side.locator('.m3e-time-picker__period-item').nth(0)),
      await box(side.locator('.m3e-time-picker__period-item').nth(1)),
    ];
    const icon = await box(side.locator('.m3e-icon'));
    expect(Math.round(am.y - field.y)).toBe(0);
    expect(Math.round(pm.y - am.y)).toBe(48);
    expect(Math.round(icon.y - am.y)).toBe(104);
    // 24-hour: the toggle alone at toggleY 84dp, its icon 12dp into the 48dp box.
    const side24 = root(page, 'scroll-24h-uncontained').locator('.m3e-time-picker__side');
    const top = await box(side24);
    expect(Math.round((await box(side24.locator('.m3e-icon'))).y - top.y)).toBe(96);
  });

  test('every interactive part is at least 48px', async ({ page }) => {
    for (const selector of [
      '.m3e-time-picker__selector',
      '.m3e-time-picker__period-item',
      '.m3e-time-picker__face[data-active] .m3e-time-picker__label',
      '.m3e-time-input__input',
      '.m3e-time-scroll__field',
      '.m3e-time-picker__side .m3e-icon-button',
    ]) {
      for (const el of await page
        .locator(
          `m3e-time-picker ${selector}, m3e-time-input ${selector}, m3e-time-scroll ${selector}`,
        )
        .all()) {
        if (!(await el.isVisible())) continue; // A closed dialog, the AM/PM of a 24-hour picker.
        // The box, grown by a touch target ::after (the 38–40dp AM / PM buttons).
        const size = await el.evaluate((node) => {
          const r = node.getBoundingClientRect();
          const after = getComputedStyle(node, '::after');
          const out = (v: string) =>
            after.position === 'absolute' ? Math.max(0, -parseFloat(v) || 0) : 0;
          return Math.min(
            r.width + out(after.left) + out(after.right),
            r.height + out(after.top) + out(after.bottom),
          );
        });
        expect(size, selector).toBeGreaterThanOrEqual(47.5);
      }
    }
  });

  test('the scroll fields: 100dp wide, as tall as the time fields (TimeScroll L2310–2337)', async ({
    page,
  }) => {
    const wheel = await box(root(page, 'scroll-12h').locator('.m3e-time-scroll__field').first());
    expect([wheel.width, wheel.height]).toEqual([
      await px(page, '--m3e-comp-time-picker-scroll-field-width'),
      await px(page, '--m3e-comp-time-picker-vibrant-time-field-height'),
    ]);
    const uncontained = await box(
      root(page, 'scroll-24h-uncontained').locator('.m3e-time-scroll__field').first(),
    );
    expect(uncontained.height).toBe(
      await px(page, '--m3e-comp-time-picker-uncontained-time-field-height'),
    );
  });
});

test.describe('behavior', () => {
  test('dial: a tap picks the hour, then the dial switches to minutes', async ({ page }) => {
    await recordChanges(page, 'dial-12h');
    await label(page, 'dial-12h', '3').click();
    await expect.poll(() => changes(page)).toContainEqual({ hour: 3, minute: 41 });
    await expect(root(page, 'dial-12h')).toHaveAttribute('data-selection', 'minute');
    await label(page, 'dial-12h', '15').click();
    await expect.poll(() => changes(page)).toContainEqual({ hour: 3, minute: 15 });
    await expect(
      root(page, 'dial-12h').locator('.m3e-time-picker__selector').first(),
    ).toContainText('03');
  });

  test('dial: arrow keys move around the dial, Enter picks (no switch)', async ({ page }) => {
    await recordChanges(page, 'dial-12h');
    await label(page, 'dial-12h', '9').focus();
    await page.keyboard.press('ArrowRight');
    await expect(label(page, 'dial-12h', '10')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(label(page, 'dial-12h', '10')).toHaveAttribute('aria-checked', 'true');
    await expect(root(page, 'dial-12h')).toHaveAttribute('data-selection', 'hour');
    expect(await changes(page)).toContainEqual({ hour: 10, minute: 41 });
  });

  test('AM / PM toggle buttons are a radio group', async ({ page }) => {
    await recordChanges(page, 'dial-12h');
    const items = root(page, 'dial-12h').locator('.m3e-time-picker__period-item');
    await expect(items.nth(0)).toHaveAttribute('aria-checked', 'true');
    await items.nth(0).focus();
    await page.keyboard.press('ArrowDown');
    await expect(items.nth(1)).toBeFocused();
    await expect(items.nth(1)).toHaveAttribute('aria-checked', 'true');
    expect(await changes(page)).toContainEqual({ hour: 21, minute: 41 });
  });

  test('input: digits fill the hour, move on to the minutes; Up / Down step', async ({ page }) => {
    await recordChanges(page, 'input-24h-vibrant');
    const fields = root(page, 'input-24h-vibrant').locator('input');
    await fields.nth(0).focus();
    await fields.nth(0).selectText();
    await page.keyboard.type('0745');
    await expect(fields.nth(1)).toBeFocused();
    await expect(fields.nth(0)).toHaveValue('07');
    await expect(fields.nth(1)).toHaveValue('45');
    await expect.poll(() => changes(page)).toContainEqual({ hour: 7, minute: 45 });
    await page.keyboard.press('ArrowUp');
    await expect(fields.nth(1)).toHaveValue('46');
    await page.keyboard.type('x');
    await expect(fields.nth(1)).toHaveValue('46');
  });

  test('input: an hour out of range is kept and announced', async ({ page }) => {
    const fields = root(page, 'input-12h').locator('input');
    await fields.nth(0).focus();
    await fields.nth(0).selectText();
    await page.keyboard.type('13');
    await expect(fields.nth(0)).toHaveValue('13');
    await expect(fields.nth(0)).toHaveAttribute('aria-invalid', 'true');
    await expect(root(page, 'input-12h').locator('.m3e-time-input__supporting').first()).toHaveText(
      'Hour must be 1–12',
    );
  });

  test('scroll: the wheels are spin buttons; a click on a row scrolls to it', async ({ page }) => {
    await recordChanges(page, 'scroll-24h-uncontained');
    const wheels = root(page, 'scroll-24h-uncontained').locator('.m3e-time-scroll__field');
    // ScrollField: Down → the next value, Up → the previous one.
    await wheels.nth(1).focus();
    await page.keyboard.press('ArrowDown');
    await expect(wheels.nth(1)).toHaveAttribute('aria-valuenow', '46');
    await expect.poll(() => changes(page)).toContainEqual({ hour: 6, minute: 46 });
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp');
    await expect(wheels.nth(1)).toHaveAttribute('aria-valuenow', '44');
    await expect.poll(() => changes(page)).toContainEqual({ hour: 6, minute: 44 });
    // A click on a row scrolls to it.
    await wheels.nth(0).locator('.m3e-time-scroll__item[data-selected] + *').click();
    await expect(wheels.nth(0)).toHaveAttribute('aria-valuenow', '7');
  });

  test('element dialog: OK reports the picked time', async ({ page }) => {
    await page.getByTestId('open-dialog').click();
    await settle(page);
    await label(page, 'dialog', '4').click();
    await page.getByTestId('dialog-ok').click();
    await expect(page.getByTestId('dialog-result')).toHaveText('04:15');
  });

  test('React: the switchable dialog toggles between the dial and the input', async ({ page }) => {
    await page.getByTestId('react-open-dialog').click();
    const surface = page.locator('dialog[open] .m3e-time-picker-dialog');
    await expect(surface.locator('.m3e-time-picker-dialog__title')).toHaveText('Select Time');
    await surface.getByRole('button', { name: 'Switch to text input mode' }).click();
    await expect(surface.locator('.m3e-time-picker-dialog__title')).toHaveText('Enter Time');
    const fields = surface.locator('.m3e-time-input input');
    await fields.nth(1).focus();
    await fields.nth(1).selectText();
    await page.keyboard.type('05');
    await page.getByTestId('react-dialog-ok').click();
    await expect(page.getByTestId('react-value')).toHaveText('13:05');
  });
});

test('forced colors: the selected value and the selector stay visible', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'forced-colors emulation is Chromium only');
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  await expect(figure(page, 'dial-12h')).toHaveScreenshot('dial-12h-forced-colors.png');
  await expect(figure(page, 'input-uncontained')).toHaveScreenshot(
    'input-uncontained-forced-colors.png',
  );
});

test('reduced motion: the selector and the wheels jump', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const name of [
    '--m3e-comp-time-picker-selector-duration',
    '--m3e-comp-time-picker-scroll-item-duration',
    '--m3e-comp-time-picker-scroll-page-duration',
    '--m3e-comp-time-picker-scroll-settle-duration',
  ]) {
    expect(await token(page, name), name).toMatch(/^0m?s$/);
  }
});
