import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';

// Assist chip (COMPONENT_SPEC §18): acceptance + light/dark × 3 browsers baselines, axe.
const VARIANTS = ['flat', 'elevated'] as const;

const box = async (el: Locator) => (await el.boundingBox())!;
const layerOpacity = (el: Locator) =>
  el.evaluate((node) => Number.parseFloat(getComputedStyle(node, '::before').opacity));
const shadow = (el: Locator) => el.evaluate((node) => getComputedStyle(node).boxShadow);
/** Bounds of the label's text, without the label element's spacing. */
const textBox = (chip: Locator) =>
  chip.locator('.m3e-assist-chip__label').evaluate((label) => {
    const range = document.createRange();
    range.selectNodeContents(label);
    const { left, right } = range.getBoundingClientRect();
    return { left, right };
  });
const resolved = (page: Page, token: string) =>
  page.evaluate((name) => {
    const probe = document.createElement('div');
    probe.style.color = `var(${name})`;
    document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  }, token);

test.beforeEach(async ({ page }) => {
  await page.goto('/components/assist-chip/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByTestId('react-chips').locator('.m3e-assist-chip')).toHaveCount(3);
});

test('has no axe violations', async ({ page }) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();
  expect(results.violations).toEqual([]);
});

test('matches the visual baseline', async ({ page }) => {
  await expect(page).toHaveScreenshot('assist-chip.png', { fullPage: true });
});

test('32dp tall with ChipContent spacing (8dp padding + 8dp around the label)', async ({
  page,
}) => {
  for (const variant of VARIANTS) {
    const plain = page.getByTestId(`${variant}-plain`);
    const chip = await box(plain);
    expect(chip.height, variant).toBeCloseTo(32, 1);
    let text = await textBox(plain);
    expect(text.left - chip.x).toBeCloseTo(16, 0);
    expect(chip.x + chip.width - text.right).toBeCloseTo(16, 0);

    const leading = page.getByTestId(`${variant}-leading`);
    const lead = await box(leading);
    const icon = await box(leading.locator('.m3e-icon'));
    text = await textBox(leading);
    expect(icon.width).toBeCloseTo(18, 1);
    expect(icon.x - lead.x).toBeCloseTo(8, 0);
    expect(text.left - (icon.x + icon.width)).toBeCloseTo(8, 0);
    expect(lead.x + lead.width - text.right).toBeCloseTo(16, 0);

    const trailing = page.getByTestId(`${variant}-trailing`);
    const trail = await box(trailing);
    const end = await box(trailing.locator('.m3e-icon'));
    text = await textBox(trailing);
    expect(text.left - trail.x).toBeCloseTo(16, 0);
    expect(end.x - text.right).toBeCloseTo(8, 0);
    expect(trail.x + trail.width - (end.x + end.width)).toBeCloseTo(8, 0);
  }
});

test('the flat outline takes no layout space', async ({ page }) => {
  const flat = await box(page.getByTestId('flat-plain'));
  const elevated = await box(page.getByTestId('elevated-plain'));
  expect(flat.width).toBeCloseTo(elevated.width, 1);
  expect(await shadow(page.getByTestId('flat-plain'))).toContain('inset');
});

test('icons are primary, labels on-surface', async ({ page }) => {
  const primary = await resolved(page, '--m3e-sys-color-primary');
  const onSurface = await resolved(page, '--m3e-sys-color-on-surface');
  const chip = page.getByTestId('flat-leading');
  expect(await chip.locator('.m3e-icon').evaluate((el) => getComputedStyle(el).color)).toBe(
    primary,
  );
  expect(await chip.evaluate((el) => getComputedStyle(el).color)).toBe(onSurface);
});

test('touch target reaches 48dp', async ({ page }) => {
  const chip = page.getByTestId('flat-plain');
  const b = await box(chip);
  const hit = await page.evaluate(
    ({ x, y }) => document.elementFromPoint(x, y)?.getAttribute('data-testid'),
    { x: b.x + b.width / 2, y: b.y - 7 },
  );
  expect(hit).toBe('flat-plain');
});

test('hover: state layer on both; only the elevated chip rises', async ({ page }) => {
  const hoverOpacity = await page.evaluate(() =>
    Number.parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue(
        '--m3e-sys-state-hover-state-layer-opacity',
      ),
    ),
  );
  for (const variant of VARIANTS) {
    const chip = page.getByTestId(`${variant}-plain`);
    const before = await shadow(chip);
    await chip.hover();
    await expect.poll(() => layerOpacity(chip), { timeout: 3000 }).toBeCloseTo(hoverOpacity, 2);
    if (variant === 'flat') expect(await shadow(chip)).toBe(before);
    else await expect.poll(() => shadow(chip), { timeout: 3000 }).not.toBe(before);
  }
});

test('disabled chips draw no state layer and dim their content', async ({ page }) => {
  for (const variant of VARIANTS) {
    const chip = page.getByTestId(`${variant}-disabled`);
    const enabled = page.getByTestId(`${variant}-leading`);
    expect(await chip.evaluate((el) => getComputedStyle(el, '::before').display)).toBe('none');
    expect(await chip.evaluate((el) => getComputedStyle(el).color)).not.toBe(
      await enabled.evaluate((el) => getComputedStyle(el).color),
    );
    expect(await chip.evaluate((el) => getComputedStyle(el).cursor)).toBe('default');
  }
});

test('keyboard focus shows the ring', async ({ page }) => {
  const chip = page.getByTestId('elevated-leading');
  await page.getByTestId('elevated-plain').focus();
  await page.keyboard.press('Tab');
  await expect(chip).toBeFocused();
  expect(await chip.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('solid');
  const b = await box(chip);
  await expect(page).toHaveScreenshot('assist-chip-focused.png', {
    clip: { x: b.x - 8, y: b.y - 8, width: b.width + 16, height: b.height + 16 },
  });
});

for (const variant of VARIANTS) {
  test(`states: ${variant} hovered`, async ({ page }) => {
    const chip = page.getByTestId(`${variant}-leading`);
    await chip.hover();
    const b = await box(chip);
    await expect(page).toHaveScreenshot(`assist-chip-${variant}-hovered.png`, {
      clip: { x: b.x - 8, y: b.y - 8, width: b.width + 16, height: b.height + 16 },
    });
  });
}

test('React chip: press shows the pressed state and calls onPress', async ({ page }) => {
  const chip = page.getByTestId('react-chips').locator('.m3e-assist-chip').first();
  await chip.scrollIntoViewIfNeeded();
  const b = await box(chip);
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await expect(chip).toHaveAttribute('data-pressed', '');
  await page.mouse.up();
  await expect(page.getByText('Pressed 1 times.')).toBeVisible();
});

test.describe('forced colors', () => {
  test.use({ forcedColors: 'active' });

  test('every chip keeps a visible boundary', async ({ page }) => {
    for (const variant of VARIANTS) {
      const style = await page
        .getByTestId(`${variant}-plain`)
        .evaluate((el) => getComputedStyle(el).borderTopStyle);
      expect(style, variant).toBe('solid');
    }
  });
});
