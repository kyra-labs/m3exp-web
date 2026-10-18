import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';

// Lists (COMPONENT_SPEC §20): static one / two / three-line items, segmented items, interactive
// lists in <m3e-list> (single / multiple / action, radio / checkbox / switch indicators), React and
// the legacy item (D4). Acceptance (segmented first / last outer radii; arrow keys move focus,
// wrapping) + light/dark × 3 browsers baselines, axe, the shape morph per state, selected /
// dragged / disabled colors, forced colors and reduced motion.
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
const DISABLED = '.m3e-list-item--disabled, .m3e-list-item[aria-disabled="true"]';

const box = async (el: Locator) => (await el.boundingBox())!;
const style = (el: Locator, prop: string, pseudo?: string) =>
  el.evaluate((node, [p, ps]) => getComputedStyle(node, ps).getPropertyValue(p!), [prop, pseudo]);
const radii = (el: Locator) =>
  el.evaluate((node) => {
    const s = getComputedStyle(node);
    return [
      s.borderTopLeftRadius,
      s.borderTopRightRadius,
      s.borderBottomRightRadius,
      s.borderBottomLeftRadius,
    ].map((v) => Math.round(Number.parseFloat(v) * 10) / 10);
  });
const resolveColor = (page: Page, value: string) =>
  page.evaluate((v) => {
    const probe = document.createElement('div');
    probe.style.color = v;
    document.body.append(probe);
    const out = getComputedStyle(probe).color;
    probe.remove();
    return out;
  }, value);
const options = (page: Page, id: string) => page.getByTestId(id).locator('.m3e-list-item');
const items = (page: Page, id: string) => page.getByTestId(id).locator(':scope > li');
const clip = (b: { x: number; y: number; width: number; height: number }, pad = 8) => ({
  x: b.x - pad,
  y: b.y - pad,
  width: b.width + 2 * pad,
  height: b.height + 2 * pad,
});
/** Waits for the corner transitions (fast spatial) to settle. */
const settle = (el: Locator) =>
  el.evaluate(async (node) => {
    await Promise.all(node.getAnimations().map((a) => a.finished.catch(() => undefined)));
  });

test.beforeEach(async ({ page }) => {
  await page.goto('/components/list/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByTestId('element-single').locator('[role="listbox"]')).toHaveCount(1);
  await expect(page.getByTestId('react-lists').locator('.m3e-list-item')).toHaveCount(10);
});

test('has no axe violations', async ({ page }) => {
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).exclude(DISABLED).analyze();
  expect(results.violations).toEqual([]);
  // WCAG 1.4.3 exempts inactive components: the disabled items skip only the contrast rule.
  const disabled = await new AxeBuilder({ page })
    .include(DISABLED)
    .withTags(AXE_TAGS)
    .disableRules(['color-contrast'])
    .analyze();
  expect(disabled.violations).toEqual([]);
});

test('matches the visual baseline', async ({ page }) => {
  await expect(page).toHaveScreenshot('list.png', { fullPage: true });
});

test('acceptance: segmented first and last items get the outer radii', async ({ page }) => {
  // segmentedShapes: first → top corners, last → bottom corners (16dp), the rest 4dp.
  const segmented = items(page, 'segmented');
  await expect(segmented).toHaveCount(4);
  expect(await radii(segmented.nth(0))).toEqual([16, 16, 4, 4]);
  expect(await radii(segmented.nth(1))).toEqual([4, 4, 4, 4]);
  expect(await radii(segmented.nth(2))).toEqual([4, 4, 4, 4]);
  expect(await radii(segmented.nth(3))).toEqual([4, 4, 16, 16]);
  // A single item: all four.
  expect(await radii(items(page, 'segmented-single').first())).toEqual([16, 16, 16, 16]);
  // In an interactive list too, and the gap is SegmentedGap.
  const element = options(page, 'element-segmented');
  expect(await radii(element.first())).toEqual([16, 16, 4, 4]);
  expect(await radii(element.last())).toEqual([16, 16, 16, 16]); // dragged: CornerLarge
  const a = await box(segmented.nth(0));
  const b = await box(segmented.nth(1));
  expect(Math.round(b.y - (a.y + a.height))).toBe(2);
});

test('acceptance: arrow keys move focus in interactive lists, wrapping (element and React)', async ({
  page,
}) => {
  const list = options(page, 'element-single');
  // Tab enters at the selected option (React Aria listbox).
  await page.getByTestId('element-single').locator('[role="listbox"]').focus();
  await expect(list.nth(1)).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(list.nth(2)).toBeFocused();
  // The disabled fourth option is skipped; Down wraps to the first.
  await page.keyboard.press('ArrowDown');
  await expect(list.nth(0)).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(list.nth(2)).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(list.nth(0)).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(list.nth(2)).toBeFocused();
  await page.keyboard.press('Home');
  await expect(list.nth(0)).toBeFocused();
  await page.keyboard.press('End');
  await expect(list.nth(2)).toBeFocused();
  // Space selects (single: replaces).
  await page.keyboard.press('Space');
  await expect(list.nth(2)).toHaveAttribute('aria-selected', 'true');
  await expect(list.nth(1)).toHaveAttribute('aria-selected', 'false');
  await expect(page.getByTestId('element-log')).toHaveText('Selected: 3');

  const react = page.getByTestId('react-lists').locator('[aria-label="React single selection"]');
  const reactOptions = react.locator('[role="option"]');
  // One focus() call, as Tab does (Playwright's focus() refocuses the listbox after React Aria
  // has moved focus to the option).
  await react.evaluate((el) => {
    el.focus();
  });
  await expect(reactOptions.nth(1)).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await expect(reactOptions.nth(0)).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(reactOptions.nth(2)).toBeFocused();
});

test('typeahead and the single tab stop', async ({ page }) => {
  const list = options(page, 'element-action');
  await list.first().focus();
  await page.keyboard.press('s');
  await expect(list.nth(2)).toBeFocused();
  await expect(list.nth(2)).toHaveAttribute('tabindex', '0');
  await expect(list.nth(0)).toHaveAttribute('tabindex', '-1');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('element-log')).toHaveText('Opened: send');
});

test('geometry: 56 / 72 / 88dp lines, 16 / 10dp padding, 12dp slot spacing; three-line on top', async ({
  page,
}) => {
  const standard = items(page, 'static-standard');
  const heights = await standard.evaluateAll((els) =>
    els.map((el) => Math.round(el.getBoundingClientRect().height)),
  );
  expect(heights).toEqual([56, 72, 88, 88]);
  const first = standard.first();
  expect(await style(first, 'padding')).toBe('10px 16px');
  const icon = await box(first.locator('.m3e-list-item__leading'));
  const content = await box(first.locator('.m3e-list-item__content'));
  expect(Math.round(content.x - (icon.x + icon.width))).toBe(12);
  expect(Math.round(icon.x - (await box(first)).x)).toBe(16);
  // Two-line: centred; three-line: the slots at the top padding.
  const two = standard.nth(1);
  const twoIcon = await box(two.locator('.m3e-list-item__leading'));
  const twoBox = await box(two);
  expect(Math.round(twoIcon.y + twoIcon.height / 2 - (twoBox.y + twoBox.height / 2))).toBe(0);
  const three = standard.nth(2);
  const threeIcon = await box(three.locator('.m3e-list-item__leading'));
  const threeBox = await box(three);
  expect(Math.round(threeIcon.y - threeBox.y)).toBe(10);
  // Type: headline body large, overline label small, supporting body medium.
  expect(await style(three.locator('.m3e-list-item__headline'), 'font-size')).toBe('16px');
  expect(await style(three.locator('.m3e-list-item__overline'), 'font-size')).toBe('11px');
  expect(await style(three.locator('.m3e-list-item__supporting'), 'font-size')).toBe('14px');
  // Indicators: no minimum interactive size in the slot (radio 24dp, checkbox 18dp, switch 52 × 32).
  const radio = await box(options(page, 'element-single').first().locator('.m3e-radio-button'));
  expect([Math.round(radio.width), Math.round(radio.height)]).toEqual([24, 24]);
  const checkbox = await box(options(page, 'element-multiple').first().locator('.m3e-checkbox'));
  expect([Math.round(checkbox.width), Math.round(checkbox.height)]).toEqual([18, 18]);
  const toggle = await box(options(page, 'element-switches').first().locator('.m3e-switch'));
  expect([Math.round(toggle.width), Math.round(toggle.height)]).toEqual([52, 32]);
  // The legacy item: 8dp vertical padding (12dp three-line), 16dp before the text.
  const legacy = items(page, 'legacy');
  expect(await style(legacy.first(), 'padding')).toBe('8px 16px');
  expect(await style(legacy.nth(2), 'padding')).toBe('12px 16px');
  expect(await radii(legacy.first())).toEqual([0, 0, 0, 0]);
});

test('selected, dragged and disabled colors (ListItemColors)', async ({ page }) => {
  const color = (name: string) => resolveColor(page, `var(--m3e-sys-color-${name})`);
  const selected = options(page, 'element-single').nth(1);
  await expect(selected).toHaveAttribute('aria-selected', 'true');
  expect(await style(selected, 'background-color')).toBe(await color('secondary-container'));
  expect(await style(selected.locator('.m3e-list-item__headline'), 'color')).toBe(
    await color('on-secondary-container'),
  );
  expect(await radii(selected)).toEqual([16, 16, 16, 16]);
  await expect(selected.locator('input')).toBeChecked();
  const dragged = options(page, 'element-segmented').last();
  expect(await style(dragged, 'background-color')).toBe(await color('tertiary-container'));
  expect(await style(dragged.locator('.m3e-list-item__headline'), 'color')).toBe(
    await color('on-tertiary-container'),
  );
  expect(await style(dragged, 'box-shadow')).not.toBe('none');
  expect(await style(dragged, 'z-index')).toBe('1');
  // Disabled: the enabled container, content at 38 %.
  const disabled = options(page, 'element-single').nth(3);
  expect(await style(disabled, 'background-color')).toBe(
    await style(options(page, 'element-single').first(), 'background-color'),
  );
  const headline = await style(disabled.locator('.m3e-list-item__headline'), 'color');
  expect(headline).toMatch(/0\.38\)$/);
  await expect(disabled.locator('input')).toBeDisabled();
});

test('the shape morph: hovered 12dp, focused / pressed / selected 16dp; hover changes no color', async ({
  page,
}) => {
  const list = options(page, 'element-multiple');
  const item = list.nth(1);
  const rest = await style(item, 'background-color');
  expect(await radii(item)).toEqual([4, 4, 4, 4]);
  expect(await style(item, 'transition-property')).toContain('border');
  await item.hover();
  await settle(item);
  expect(await radii(item)).toEqual([12, 12, 12, 12]);
  expect(await style(item, 'background-color')).toBe(rest);
  await expect(page).toHaveScreenshot('list-hovered.png', {
    clip: clip(await box(page.getByTestId('element-multiple').locator('.m3e-list'))),
  });
  await page.mouse.down();
  await expect(item).toHaveAttribute('data-pressed', '');
  await settle(item);
  expect(await radii(item)).toEqual([16, 16, 16, 16]);
  await expect(page).toHaveScreenshot('list-pressed.png', {
    clip: clip(await box(page.getByTestId('element-multiple').locator('.m3e-list'))),
  });
  await page.mouse.up();
  await expect(item).toHaveAttribute('aria-selected', 'true');
  await page.mouse.move(0, 0);
  // Keyboard focus.
  await list.first().focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  const third = list.nth(2);
  await expect(third).toBeFocused();
  await settle(third);
  expect(await radii(third)).toEqual([16, 16, 16, 16]);
  await page.keyboard.press('ArrowUp');
  await settle(list.nth(1));
  await expect(page).toHaveScreenshot('list-focused.png', {
    clip: clip(await box(page.getByTestId('element-multiple').locator('.m3e-list'))),
  });
});

test('React options: listbox semantics, indicators and the inline corner springs', async ({
  page,
}) => {
  const react = page.getByTestId('react-lists');
  const single = react.locator('[aria-label="React single selection"]');
  await expect(single).toHaveAttribute('role', 'listbox');
  const opts = single.locator('[role="option"]');
  await expect(opts.nth(1)).toHaveAttribute('aria-selected', 'true');
  await opts.nth(0).click();
  await expect(opts.nth(0)).toHaveAttribute('aria-selected', 'true');
  await expect(opts.nth(0).locator('input')).toBeChecked();
  await expect(opts.nth(1).locator('input')).not.toBeChecked();
  await page.mouse.move(0, 0);
  await expect.poll(async () => (await radii(opts.nth(0)))[0], { timeout: 3000 }).toBe(16);
  await expect.poll(async () => (await radii(opts.nth(1)))[0], { timeout: 3000 }).toBe(4);
  // A live switch in a static item keeps its own role and a 48dp hit area.
  const toggle = react.locator('.m3e-switch__input');
  await expect(toggle).toHaveAccessibleName('Dark theme');
  expect(Math.round((await box(toggle)).height)).toBe(48);
  await react.locator('[aria-label="React actions"] [role="option"]').first().click();
  await expect(react.getByText('Opened: inbox')).toBeVisible();
});

test('the legacy item is marked deprecated (D4)', async ({ page }) => {
  await expect(page.locator('[data-deprecated] .docs-deprecated')).toContainText('D4');
});

test.describe('forced colors', () => {
  test.use({ forcedColors: 'active' });

  test('segmented and interactive items keep visible boundaries; selected shows Highlight', async ({
    page,
  }) => {
    const transparent = /rgba\(0, 0, 0, 0\)|\/ 0\)|transparent/;
    const segmented = items(page, 'segmented').first();
    expect(await style(segmented, 'outline-style')).toBe('solid');
    expect(await style(segmented, 'outline-color')).not.toMatch(transparent);
    const selected = options(page, 'element-single').nth(1);
    expect(await style(selected, 'outline-color')).toBe(await resolveColor(page, 'Highlight'));
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the corners jump (spatial duration 0)', async ({ page }) => {
    const item = options(page, 'element-multiple').nth(1);
    await item.hover();
    expect(await radii(item)).toEqual([12, 12, 12, 12]);
  });
});
