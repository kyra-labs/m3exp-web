import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';

// Divider (COMPONENT_SPEC §35): acceptance + light/dark × 3 browsers baselines, axe.
const rect = (el: Locator) =>
  el.evaluate((node) => {
    const { width, height } = node.getBoundingClientRect();
    return { width, height };
  });

/** The resolved outline-variant color, for comparing against the drawn line. */
const outlineVariant = (page: Page) =>
  page.evaluate(() => {
    const probe = document.createElement('div');
    probe.style.color = 'var(--m3e-sys-color-outline-variant)';
    document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  });

test.beforeEach(async ({ page }) => {
  await page.goto('/components/divider/');
  await page.evaluate(() => document.fonts.ready);
});

test('has no axe violations', async ({ page }) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();
  expect(results.violations).toEqual([]);
});

test('matches the visual baseline', async ({ page }) => {
  await expect(page).toHaveScreenshot('divider.png', { fullPage: true });
});

test('renders a 1dp outline-variant line', async ({ page }) => {
  const color = await outlineVariant(page);
  for (const id of ['full', 'inset']) {
    const divider = page.getByTestId(id);
    expect((await rect(divider)).height, id).toBe(1);
    expect(await divider.evaluate((el) => getComputedStyle(el).borderTopColor)).toBe(color);
  }
  const vertical = page.getByTestId('vertical');
  expect((await rect(vertical)).width).toBe(1);
  expect(await vertical.evaluate((el) => getComputedStyle(el).borderInlineStartColor)).toBe(color);
});

test('horizontal fills the width; vertical fills the row height', async ({ page }) => {
  const list = await rect(page.getByTestId('horizontal'));
  expect((await rect(page.getByTestId('full'))).width).toBe(list.width);
  const inset = await page
    .getByTestId('inset')
    .evaluate((el) => Number.parseFloat(getComputedStyle(el).marginInlineStart));
  expect((await rect(page.getByTestId('inset'))).width).toBe(list.width - inset);

  const row = page.getByTestId('vertical-row');
  const content = await row.evaluate((el) => {
    const style = getComputedStyle(el);
    return (
      el.getBoundingClientRect().height -
      Number.parseFloat(style.paddingTop) -
      Number.parseFloat(style.paddingBottom)
    );
  });
  expect((await rect(page.getByTestId('vertical'))).height).toBe(content);
});

test.describe('high-density screens', () => {
  test.use({ deviceScaleFactor: 2 });

  test('stays 1 device-independent px', async ({ page }) => {
    expect((await rect(page.getByTestId('full'))).height).toBe(1);
    expect((await rect(page.getByTestId('vertical'))).width).toBe(1);
  });
});

test.describe('forced colors', () => {
  test.use({ forcedColors: 'active' });

  test('the line survives as a border', async ({ page }) => {
    const style = await page.getByTestId('full').evaluate((el) => {
      const s = getComputedStyle(el);
      return { style: s.borderTopStyle, color: s.borderTopColor };
    });
    expect(style.style).toBe('solid');
    expect(style.color).not.toBe('rgba(0, 0, 0, 0)');
    expect(
      await page
        .getByTestId('vertical')
        .evaluate((el) => getComputedStyle(el).borderInlineStartStyle),
    ).toBe('solid');
  });
});
