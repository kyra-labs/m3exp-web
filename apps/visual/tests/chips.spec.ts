import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { expectTargetSizes } from './target-size.js';

// Chips (COMPONENT_SPEC §18): filter (flat / elevated × baseline / expressive), input chips in
// <m3e-chip-set>, suggestion chips, a single-line chip set and React. Acceptance (the leading
// check when selected; Backspace / Delete removes the focused input chip) + light/dark × 3
// browsers baselines, axe, keyboard, the flat filter chip's Level1 hover (owner decision M8 #11),
// the expressive shapes (#9), forced colors and reduced motion.
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
const DISABLED =
  '[data-testid$="-disabled"], [data-testid$="-disabled-selected"], .m3e-input-chip[aria-disabled="true"], [data-testid="react-chips"] .m3e-filter-chip:has(:disabled)';

const box = async (el: Locator) => (await el.boundingBox())!;
const style = (el: Locator, prop: string, pseudo?: string) =>
  el.evaluate((node, [p, ps]) => getComputedStyle(node, ps).getPropertyValue(p!), [prop, pseudo]);
const radius = async (el: Locator) => Number.parseFloat(await style(el, 'border-top-left-radius'));
const token = (page: Page, name: string) =>
  page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
/** The label text's bounds, without the label element's spacing. */
const textBox = (chip: Locator) =>
  chip.locator('[class$="-chip__label"]').evaluate((label) => {
    const range = document.createRange();
    range.selectNodeContents(label);
    const { left, right } = range.getBoundingClientRect();
    return { left, right };
  });
const resolved = (page: Page, value: string) =>
  page.evaluate((v) => {
    const probe = document.createElement('div');
    probe.style.boxShadow = v;
    probe.style.color = v.startsWith('var(--m3e-sys-color') ? v : '';
    document.body.append(probe);
    const s = getComputedStyle(probe);
    const out = v.startsWith('var(--m3e-sys-color') ? s.color : s.boxShadow;
    probe.remove();
    return out;
  }, value);
const clip = (b: { x: number; y: number; width: number; height: number }, pad = 10) => ({
  x: b.x - pad,
  y: b.y - pad,
  width: b.width + 2 * pad,
  height: b.height + 2 * pad,
});
const chip = (page: Page, id: string) => page.getByTestId(id);
const inputChips = (page: Page, set: string) =>
  page.getByTestId(set).locator('.m3e-chip-set > .m3e-input-chip');

test.beforeEach(async ({ page }) => {
  await page.goto('/components/chips/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByTestId('input-baseline').locator('[role="grid"]')).toHaveCount(1);
  await expect(page.getByTestId('react-chips').locator('.m3e-input-chip')).toHaveCount(4);
});

test('has no axe violations', async ({ page }) => {
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).exclude(DISABLED).analyze();
  expect(results.violations).toEqual([]);
  // WCAG 1.4.3 exempts inactive components: the disabled chips skip only the contrast rule.
  const disabled = await new AxeBuilder({ page })
    .include(DISABLED)
    .withTags(AXE_TAGS)
    .disableRules(['color-contrast'])
    .analyze();
  expect(disabled.violations).toEqual([]);
});

test('matches the visual baseline', async ({ page }) => {
  await expect(page).toHaveScreenshot('chips.png', { fullPage: true });
});

test('acceptance: a filter chip shows the leading check when selected', async ({ page }) => {
  const unselected = chip(page, 'filter-flat-unselected');
  const slot = unselected.locator('.m3e-filter-chip__leading');
  const check = unselected.locator('.m3e-filter-chip__check');
  expect((await box(slot)).width).toBe(0);
  await expect(check).toBeHidden();
  await unselected.click();
  await expect(unselected.locator('input')).toBeChecked();
  await expect(check).toBeVisible();
  await expect.poll(async () => Math.round((await box(slot)).width), { timeout: 3000 }).toBe(18);
  expect(await check.textContent()).toBe('check');
  // Selected from the start, and the leading icon swapped for the check (Done ↔ Home).
  await expect(chip(page, 'filter-flat-selected').locator('.m3e-filter-chip__check')).toBeVisible();
  const home = chip(page, 'filter-flat-leading');
  await expect(home.locator('.m3e-filter-chip__leading > .m3e-icon').nth(1)).toBeVisible();
  await home.click();
  await expect(home.locator('.m3e-filter-chip__check')).toBeVisible();
  await expect(home.locator('.m3e-filter-chip__leading > .m3e-icon').nth(1)).toBeHidden();
});

test('acceptance: Backspace / Delete removes the focused input chip (element and React)', async ({
  page,
}) => {
  const rows = inputChips(page, 'input-baseline');
  await expect(rows).toHaveCount(6);
  await rows.first().focus();
  await page.keyboard.press('ArrowRight');
  await expect(rows.nth(1)).toBeFocused();
  await page.keyboard.press('Delete');
  await expect(rows).toHaveCount(5);
  await expect(page.locator('#input-removed')).toHaveText('Removed: mail.');
  await expect(rows.nth(1)).toBeFocused();
  await page.keyboard.press('Backspace');
  await expect(rows).toHaveCount(4);
  await expect(page.locator('#input-removed')).toHaveText('Removed: alan.');

  const react = page.getByTestId('react-chips').locator('.m3e-input-chip');
  await react.nth(2).focus();
  await page.keyboard.press('Backspace');
  await expect(react).toHaveCount(3);
  await expect(page.getByText('3 recipients')).toBeVisible();
  // The remove button: "Remove <label>", out of the tab order, its own 48dp target.
  const remove = react.first().locator('.m3e-input-chip__remove');
  await expect(remove).toHaveAttribute('tabindex', '-1');
  await expect(remove).toHaveAccessibleName('Remove Ada Lovelace');
  await remove.click();
  await expect(react).toHaveCount(2);
});

test('geometry: 32dp chips; baseline 8dp spacing, expressive 4dp next to icons; input chip padding', async ({
  page,
}) => {
  for (const row of ['flat', 'expressive']) {
    const plain = chip(page, `filter-${row}-unselected`);
    const b = await box(plain);
    expect(b.height).toBeCloseTo(32, 1);
    const t = await textBox(plain);
    expect(t.left - b.x).toBeCloseTo(16, 0);
    expect(b.x + b.width - t.right).toBeCloseTo(16, 0);
    const selected = chip(page, `filter-${row}-selected`);
    const s = await box(selected);
    const icon = await box(selected.locator('.m3e-filter-chip__check'));
    const st = await textBox(selected);
    expect(icon.x - s.x).toBeCloseTo(8, 0);
    expect(icon.width).toBeCloseTo(18, 1);
    expect(st.left - (icon.x + icon.width)).toBeCloseTo(row === 'flat' ? 8 : 4, 0);
    expect(s.x + s.width - st.right).toBeCloseTo(16, 0);
    const trailing = chip(page, `filter-${row}-trailing`);
    const tr = await box(trailing);
    const end = await box(trailing.locator('.m3e-filter-chip__label ~ .m3e-icon'));
    const tt = await textBox(trailing);
    expect(end.x - tt.right).toBeCloseTo(row === 'flat' ? 8 : 4, 0);
    expect(tr.x + tr.width - (end.x + end.width)).toBeCloseTo(8, 0);
  }
  // Input chips: start 4dp with an avatar, 8dp with a leading icon; end 8dp with a trailing icon,
  // 4dp without (+ the 8dp arrangement: an icon-less label is 12dp in).
  const rows = inputChips(page, 'input-baseline');
  const avatarRow = await box(rows.nth(0));
  const avatar = await box(rows.nth(0).locator('.m3e-input-chip__avatar'));
  expect(avatar.x - avatarRow.x).toBeCloseTo(4, 0);
  expect(avatar.width).toBeCloseTo(24, 1);
  const remove = await box(rows.nth(0).locator('.m3e-input-chip__remove'));
  expect(avatarRow.x + avatarRow.width - (remove.x + remove.width)).toBeCloseTo(8, 0);
  const iconRow = await box(rows.nth(1));
  const icon = await box(rows.nth(1).locator('.m3e-input-chip__cell > .m3e-icon'));
  expect(icon.x - iconRow.x).toBeCloseTo(8, 0);
  const plain = rows.nth(3);
  const p = await box(plain);
  const pt = await textBox(plain);
  expect(pt.left - p.x).toBeCloseTo(12, 0);
  expect(p.x + p.width - pt.right).toBeCloseTo(12, 0);
});

test('shapes: baseline 8dp; expressive 12dp, full when selected, 8dp while pressed', async ({
  page,
}) => {
  expect(await radius(chip(page, 'filter-flat-unselected'))).toBe(8);
  expect(await radius(chip(page, 'filter-flat-selected'))).toBe(8);
  expect(await radius(chip(page, 'filter-expressive-unselected'))).toBe(12);
  expect(await radius(chip(page, 'filter-expressive-selected'))).toBe(16);
  expect(await radius(inputChips(page, 'input-expressive').nth(2))).toBe(16);
  const pressed = chip(page, 'filter-expressive-unselected');
  const b = await box(pressed);
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await expect.poll(() => radius(pressed), { timeout: 3000 }).toBeCloseTo(8, 0);
  await expect(page).toHaveScreenshot('chips-expressive-pressed.png', { clip: clip(b) });
  await page.mouse.up();
  // Released, it is now selected: full.
  await expect.poll(() => radius(pressed), { timeout: 3000 }).toBeCloseTo(16, 0);
});

test('a flat filter chip rises to Level1 on hover, selected or not (owner decision M8 #11)', async ({
  page,
}) => {
  const level1 = await resolved(page, 'var(--m3e-sys-elevation-level1-shadow)');
  const first = level1.split(/,(?![^(]*\))/)[0]!.trim();
  for (const id of ['filter-flat-unselected', 'filter-flat-selected']) {
    const el = chip(page, id);
    await el.hover();
    await expect.poll(() => style(el, 'box-shadow'), { timeout: 3000 }).toContain(first);
  }
  const b = await box(chip(page, 'filter-flat-unselected'));
  await chip(page, 'filter-flat-unselected').hover();
  await expect(page).toHaveScreenshot('chips-filter-hovered.png', { clip: clip(b) });
  // Input and flat suggestion chips stay flat.
  for (const el of [
    inputChips(page, 'input-baseline').nth(3),
    chip(page, 'suggestion-flat-plain'),
  ]) {
    await el.hover();
    await page.waitForTimeout(300);
    expect(await style(el, 'box-shadow')).toContain('inset');
    expect(await style(el, 'box-shadow')).not.toContain(first);
  }
});

test('colors: baseline unselected leading icon primary, expressive (tonal) on-surface-variant', async ({
  page,
}) => {
  const primary = await resolved(page, 'var(--m3e-sys-color-primary)');
  const variant = await resolved(page, 'var(--m3e-sys-color-on-surface-variant)');
  const icon = (id: string) =>
    chip(page, id).locator('.m3e-filter-chip__leading > .m3e-icon').nth(1);
  expect(await style(icon('filter-flat-leading'), 'color')).toBe(primary);
  expect(await style(icon('filter-expressive-leading'), 'color')).toBe(variant);
  expect(await style(chip(page, 'suggestion-flat-plain'), 'color')).toBe(variant);
});

test('keyboard: one tab stop per chip set, arrows move and wrap, Space toggles a filter chip', async ({
  page,
}) => {
  const set = page.getByTestId('set-single-line');
  const inputs = set.locator('input');
  await expect(inputs.first()).toHaveAttribute('tabindex', '0');
  await expect(inputs.nth(1)).toHaveAttribute('tabindex', '-1');
  await inputs.first().focus();
  await page.keyboard.press('ArrowRight');
  await expect(inputs.nth(1)).toBeFocused();
  await page.keyboard.press('End');
  await expect(inputs.last()).toBeFocused();
  // The arrows wrap at the ends (React Aria TagGroup, as m3e-react's InputChipGroup).
  await page.keyboard.press('ArrowRight');
  await expect(inputs.first()).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(inputs.last()).toBeFocused();
  await page.keyboard.press('Space');
  await expect(inputs.last()).toBeChecked();
  await page.keyboard.press('Tab');
  await expect(inputs.last()).not.toBeFocused();
  // Focus rings: the filter chip label rings itself for its input; input chip rows ring.
  const filter = chip(page, 'filter-elevated-selected');
  await filter.locator('input').focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  // The ring grows from a zero-width outline (D19 (3)): wait for its 3dp width.
  await expect.poll(() => style(filter, 'outline-width')).toBe('3px');
  await expect(page).toHaveScreenshot('chips-filter-focused.png', {
    clip: clip(await box(filter)),
  });
  const row = inputChips(page, 'input-expressive').first();
  await row.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowLeft');
  await expect.poll(() => style(row, 'outline-width')).toBe('3px');
  await expect(page).toHaveScreenshot('chips-input-focused.png', { clip: clip(await box(row)) });
});

test('touch targets reach 48dp; the remove icon has its own', async ({ page }) => {
  const hit = (x: number, y: number) =>
    page.evaluate(
      ([px, py]) => {
        const el = document.elementFromPoint(px!, py!);
        return el?.closest('[data-testid]')?.getAttribute('data-testid') ?? el?.className ?? null;
      },
      [x, y],
    );
  const b = await box(chip(page, 'filter-flat-unselected'));
  expect(await hit(b.x + b.width / 2, b.y - 7)).toBe('filter-flat-unselected');
  const remove = inputChips(page, 'input-baseline').first().locator('.m3e-input-chip__remove');
  const r = await box(remove);
  const target = await remove.evaluate((el) => {
    const s = getComputedStyle(el, '::after');
    return { top: Number.parseFloat(s.top), left: Number.parseFloat(s.left) };
  });
  expect(r.width - 2 * target.left).toBeCloseTo(48, 0);
  expect(r.height - 2 * target.top).toBeCloseTo(48, 0);
});

test('every chip and remove button has a 48 × 48 hit area (hit testing)', async ({ page }) => {
  await expectTargetSizes(
    page.locator(
      '.m3e-filter-chip__input, .m3e-suggestion-chip, .m3e-input-chip, .m3e-input-chip__remove',
    ),
    'chips',
  );
});

test('disabled chips draw no state layer and keep the default cursor', async ({ page }) => {
  for (const el of [
    chip(page, 'filter-flat-disabled'),
    chip(page, 'suggestion-elevated-disabled'),
    inputChips(page, 'input-baseline').nth(4),
  ]) {
    expect(await style(el, 'display', '::before')).toBe('none');
    expect(await style(el, 'cursor')).toBe('default');
  }
});

for (const id of ['filter-elevated-selected', 'suggestion-elevated-icon']) {
  test(`states: ${id} hovered`, async ({ page }) => {
    const el = chip(page, id);
    await el.hover();
    await page.waitForTimeout(400);
    await expect(page).toHaveScreenshot(`chips-${id}-hovered.png`, { clip: clip(await box(el)) });
  });
}

test('React: a filter chip toggles and morphs; a suggestion chip presses', async ({ page }) => {
  const react = page.getByTestId('react-chips');
  const expressive = react.locator('.m3e-filter-chip--expressive').first();
  await expressive.scrollIntoViewIfNeeded();
  expect(await radius(expressive)).toBeCloseTo(12, 0);
  await expressive.click();
  await expect(expressive.locator('input')).toBeChecked();
  await expect.poll(() => radius(expressive), { timeout: 3000 }).toBeCloseTo(16, 0);
  await react.locator('.m3e-suggestion-chip').first().click();
  await expect(page.getByText('suggestion: Sounds good')).toBeVisible();
});

test.describe('forced colors', () => {
  test.use({ forcedColors: 'active' });

  test('every chip keeps a visible boundary; selected chips are marked', async ({ page }) => {
    for (const el of [
      chip(page, 'filter-flat-unselected'),
      chip(page, 'suggestion-elevated-plain'),
      inputChips(page, 'input-baseline').first(),
    ]) {
      expect(await style(el, 'border-top-style')).toBe('solid');
    }
    expect(await style(chip(page, 'filter-flat-selected'), 'outline-style')).toBe('solid');
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the check slot jumps open (spatial duration 0)', async ({ page }) => {
    const el = chip(page, 'filter-flat-unselected');
    const slot = el.locator('.m3e-filter-chip__leading');
    await el.click();
    expect(Math.round((await box(slot)).width)).toBe(18);
    expect(await token(page, '--m3e-sys-motion-spring-fast-spatial-duration')).toMatch(/^0/);
  });

  test('the check slot jumps closed too: its DefaultEffects shrink is geometry (M11 a11y L4)', async ({
    page,
  }) => {
    const el = chip(page, 'filter-flat-selected');
    const slot = el.locator('.m3e-filter-chip__leading');
    expect(Math.round((await box(slot)).width)).toBe(18);
    expect(await token(page, '--m3e-comp-selectable-chip-icon-shrink-duration')).toMatch(/^0m?s$/);
    await el.click();
    await expect(el.locator('input')).not.toBeChecked();
    expect(Math.round((await box(slot)).width)).toBe(0);
    // Only the fade runs (effects stay under reduced motion).
    const running = await slot.evaluate((node) =>
      node.getAnimations().map((a) => (a as CSSTransition).transitionProperty),
    );
    expect(running).not.toContain('inline-size');
  });
});
