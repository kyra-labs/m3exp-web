import AxeBuilder from '@axe-core/playwright';
import { type Locator, expect, test } from '@playwright/test';

// Navigation rail (COMPONENT_SPEC §14): wide navigation rail (collapsed/expanded, static in M4)
// + legacy (D4) rail. Acceptance + light/dark × 3 browsers baselines, axe.
const box = async (el: Locator) => (await el.boundingBox())!;
const part = (item: Locator, name: string) => item.locator(`.m3e-navigation-item__${name}`);
/** The element is painted on top at its center (not covered by the indicator). */
const onTop = (el: Locator) =>
  el.evaluate((node) => {
    const r = node.getBoundingClientRect();
    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return hit !== null && (hit === node || node.contains(hit));
  });

test.beforeEach(async ({ page }) => {
  await page.goto('/components/navigation-rail/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByTestId('react-rail').locator('.m3e-navigation-item')).toHaveCount(4);
});

test('has no axe violations', async ({ page }) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();
  expect(results.violations).toEqual([]);
});

test('matches the visual baseline', async ({ page }) => {
  await expect(page).toHaveScreenshot('navigation-rail.png', { fullPage: true });
});

test('collapsed rail geometry follows WideNavigationRail', async ({ page }) => {
  const rail = page.getByTestId('rail-collapsed');
  const railBox = await box(rail);
  expect(railBox.width).toBeCloseTo(96, 1);
  const header = await box(rail.locator('.m3e-wide-navigation-rail__header'));
  expect(header.y - railBox.y).toBeCloseTo(44, 1);
  const items = await rail.locator('.m3e-navigation-item').all();
  expect((await box(items[0]!)).y - (header.y + header.height)).toBeCloseTo(40, 1);
  for (const [i, item] of items.entries()) {
    const itemBox = await box(item);
    expect(itemBox.width).toBeCloseTo(96, 1);
    expect(itemBox.height).toBeCloseTo(64, 1);
    const pill = await box(part(item, 'state'));
    expect(pill.width).toBeCloseTo(56, 1);
    expect(pill.height).toBeCloseTo(32, 1);
    expect(pill.x - itemBox.x).toBeCloseTo(20, 1);
    expect(pill.y).toBeCloseTo(itemBox.y, 1);
    expect((await box(part(item, 'label'))).y - (pill.y + pill.height)).toBeCloseTo(4, 1);
    if (i > 0) {
      const previous = await box(items[i - 1]!);
      expect(itemBox.y - (previous.y + previous.height)).toBeCloseTo(4, 1);
    }
  }
});

test('expanded rail: icons before labels, as wide as the widest item (220–360)', async ({
  page,
}) => {
  const rail = page.getByTestId('rail-expanded');
  const railBox = await box(rail);
  const items = await rail.locator('.m3e-navigation-item').all();
  let widest = 0;
  for (const [i, item] of items.entries()) {
    const itemBox = await box(item);
    widest = Math.max(widest, itemBox.width);
    const pill = await box(part(item, 'state'));
    const icon = await box(part(item, 'icon'));
    const label = await box(part(item, 'label'));
    expect(pill.x - railBox.x).toBeCloseTo(20, 1);
    expect(pill.height).toBeCloseTo(56, 1);
    expect(await onTop(part(item, 'icon'))).toBe(true);
    expect(await onTop(part(item, 'label'))).toBe(true);
    expect(icon.x - pill.x).toBeCloseTo(16, 1);
    expect(label.x - (icon.x + icon.width)).toBeCloseTo(8, 1);
    expect(pill.x + pill.width).toBeCloseTo(itemBox.x + itemBox.width, 0);
    if (i > 0) expect(itemBox.y).toBeCloseTo((await box(items[i - 1]!)).y + 56, 0);
  }
  expect(railBox.width).toBeCloseTo(Math.min(360, Math.max(220, widest + 20)), 0);
});

test('React rail: selection moves aria-current; the menu button expands it', async ({ page }) => {
  const rail = page.getByTestId('react-rail');
  const items = rail.locator('.m3e-navigation-item');
  await items.nth(1).click();
  await expect(rail.locator('[aria-current]')).toHaveCount(1);
  await expect(items.nth(1)).toHaveAttribute('aria-current', 'page');
  await expect
    .poll(() => box(part(items.nth(1), 'indicator')).then((b) => b.width))
    .toBeCloseTo(56, 1);
  await rail.getByRole('button', { name: 'Expand' }).click();
  await expect(rail).toHaveClass(/m3e-wide-navigation-rail--expanded/);
  await expect.poll(() => box(rail).then((b) => b.width)).toBeGreaterThanOrEqual(220);
});

test('legacy rail geometry follows NavigationRail (D4)', async ({ page }) => {
  await expect(page.locator('[data-deprecated] .docs-deprecated')).toBeVisible();
  const rail = page.getByTestId('legacy-rail');
  const railBox = await box(rail);
  expect(railBox.width).toBeCloseTo(80, 1);
  const items = await rail.locator('.m3e-navigation-item').all();
  const first = await box(items[0]!);
  expect(first.y - railBox.y).toBeCloseTo(4, 1);
  expect(first.height).toBeCloseTo(56, 1);
  expect((await box(items[1]!)).y - (first.y + first.height)).toBeCloseTo(4, 1);
  expect((await box(part(items[0]!, 'state'))).y).toBeCloseTo(first.y, 1);
  const iconOnly = page.getByTestId('legacy-rail-icons').locator('.m3e-navigation-item').first();
  const circle = await box(part(iconOnly, 'state'));
  expect(circle.width).toBeCloseTo(56, 1);
  expect(circle.height).toBeCloseTo(56, 1);
});

test('focus ring on the indicator pill', async ({ page }) => {
  const item = page.getByTestId('c-search');
  await page.getByTestId('c-home').focus();
  await page.keyboard.press('Tab');
  await expect(item).toBeFocused();
  expect(await part(item, 'state').evaluate((el) => getComputedStyle(el).outlineStyle)).toBe(
    'solid',
  );
  const frame = await box(page.getByTestId('rail-collapsed'));
  await expect(page).toHaveScreenshot('navigation-rail-focused.png', { clip: frame });
});

test.describe('forced colors', () => {
  test.use({ forcedColors: 'active' });

  test('rails keep a boundary', async ({ page }) => {
    for (const id of ['rail-collapsed', 'legacy-rail']) {
      expect(
        await page.getByTestId(id).evaluate((el) => getComputedStyle(el).borderInlineEndStyle),
        id,
      ).toBe('solid');
    }
  });
});
