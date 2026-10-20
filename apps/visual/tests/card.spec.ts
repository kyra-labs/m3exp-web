import AxeBuilder from '@axe-core/playwright';
import { type Locator, expect, test } from '@playwright/test';
import { runningSpatialAnimations } from './reduced-motion.js';

// Card (COMPONENT_SPEC §19): acceptance + light/dark × 3 browsers baselines, axe.
const VARIANTS = ['filled', 'elevated', 'outlined'] as const;

// A card without a state layer has no ::before box at all (content: none).
const layerOpacity = (el: Locator) =>
  el.evaluate((node) => {
    const layer = getComputedStyle(node, '::before');
    return layer.content === 'none' ? 0 : Number.parseFloat(layer.opacity);
  });
// The action's stretched hit area covers the body text, so point at the card's padding corner.
const CORNER = { position: { x: 12, y: 12 } };
const shadow = (el: Locator) => el.evaluate((node) => getComputedStyle(node).boxShadow);

test.beforeEach(async ({ page }) => {
  await page.goto('/components/card/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByTestId('react-cards').locator('.m3e-card')).toHaveCount(3);
});

test('has no axe violations', async ({ page }) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .exclude('[data-testid^="disabled"]')
    .analyze();
  expect(results.violations).toEqual([]);
  // WCAG 1.4.3 exempts text of inactive components: disabled cards skip only the contrast rule.
  const disabled = await new AxeBuilder({ page })
    .include('[data-testid^="disabled"]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .disableRules(['color-contrast'])
    .analyze();
  expect(disabled.violations).toEqual([]);
});

test('matches the visual baseline', async ({ page }) => {
  await expect(page).toHaveScreenshot('card.png', { fullPage: true });
});

test('hover state layer and elevation only when interactive', async ({ page }) => {
  const hoverOpacity = await page.evaluate(() =>
    Number.parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue(
        '--m3e-sys-state-hover-state-layer-opacity',
      ),
    ),
  );
  for (const variant of VARIANTS) {
    const still = page.getByTestId('static').locator(`[data-variant="${variant}"]`);
    const rest = await shadow(still);
    await still.hover();
    expect(await layerOpacity(still), `${variant} static layer`).toBe(0);
    expect(await shadow(still), `${variant} static shadow`).toBe(rest);

    const card = page.getByTestId('interactive').locator(`[data-variant="${variant}"]`);
    const before = await shadow(card);
    await card.hover(CORNER);
    await expect.poll(() => layerOpacity(card), { timeout: 3000 }).toBeCloseTo(hoverOpacity, 2);
    // Compose: filled and elevated cards rise on hover; outlined cards keep their elevation.
    if (variant === 'outlined') expect(await shadow(card)).toBe(before);
    else await expect.poll(() => shadow(card), { timeout: 3000 }).not.toBe(before);
  }
});

test('the outline does not take layout space (Compose draws borders inside the bounds)', async ({
  page,
}) => {
  const outlined = page.getByTestId('static').locator('[data-variant="outlined"]');
  const filled = page.getByTestId('static').locator('[data-variant="filled"]');
  const size = (el: Locator) =>
    el.evaluate((node: HTMLElement) => ({
      client: node.clientWidth,
      offset: node.offsetWidth,
      height: node.offsetHeight,
    }));
  const outline = await size(outlined);
  expect(outline.client).toBe(outline.offset);
  expect(outline.height).toBe((await size(filled)).height);
});

test('the whole card follows the primary action; secondary controls stay independent', async ({
  page,
}) => {
  const card = page.getByTestId('interactive').locator('[data-variant="elevated"]');
  await card.click(CORNER);
  await expect(page).toHaveURL(/#elevated$/);
  await page.goto('/components/card/');
  const favorite = page
    .getByTestId('interactive')
    .locator('[data-variant="filled"]')
    .getByTestId('secondary');
  await favorite.click();
  await expect(page).not.toHaveURL(/#filled$/);
  await expect(favorite).toBeFocused();
});

test('keyboard focus on the action rings the card', async ({ page }) => {
  const card = page.getByTestId('interactive').locator('[data-variant="filled"]');
  const action = card.locator('.m3e-card__action');
  await action.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(action).toBeFocused();
  // The ring grows from a zero-width outline (D19 (3)): wait for its 3dp width.
  await expect.poll(() => card.evaluate((el) => getComputedStyle(el).outlineWidth)).toBe('3px');
  const box = (await card.boundingBox())!;
  await expect(page).toHaveScreenshot('card-focused.png', {
    clip: { x: box.x - 8, y: box.y - 8, width: box.width + 16, height: box.height + 16 },
  });
});

for (const variant of VARIANTS) {
  test(`states: ${variant} hovered`, async ({ page }) => {
    const card = page.getByTestId('interactive').locator(`[data-variant="${variant}"]`);
    await card.hover(CORNER);
    await expect(card).toHaveScreenshot(`card-${variant}-hovered.png`);
  });
}

test('disabled cards draw no state layer and dim their content', async ({ page }) => {
  const card = page.getByTestId('disabled');
  await card.hover();
  expect(await card.evaluate((el) => getComputedStyle(el, '::before').display)).toBe('none');
  expect(await card.evaluate((el) => getComputedStyle(el).cursor)).toBe('default');
});

test('React card: press anywhere, ripple on the card', async ({ page }) => {
  const card = page.getByTestId('react-cards').locator('.m3e-card').first();
  await card.scrollIntoViewIfNeeded();
  const box = (await card.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.8);
  await page.mouse.down();
  await expect(card).toHaveAttribute('data-pressed', '');
  await page.mouse.up();
  await expect(page.getByText('Opened: filled')).toBeVisible();
});

test.describe('forced colors', () => {
  test.use({ forcedColors: 'active' });

  test('every card keeps a visible boundary', async ({ page }) => {
    for (const variant of VARIANTS) {
      const style = await page
        .getByTestId('static')
        .locator(`[data-variant="${variant}"]`)
        .evaluate((el) => getComputedStyle(el, '::after').borderTopStyle);
      expect(style, variant).toBe('solid');
    }
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('hover and press move nothing: only the elevation and state layer change', async ({
    page,
  }) => {
    for (const variant of VARIANTS) {
      const card = page.getByTestId('interactive').locator(`[data-variant="${variant}"]`);
      await card.scrollIntoViewIfNeeded();
      const before = (await card.boundingBox())!;
      await card.hover(CORNER);
      expect(await runningSpatialAnimations(page), `${variant} hover`).toEqual([]);
      await page.mouse.down();
      expect(await runningSpatialAnimations(page), `${variant} press`).toEqual([]);
      expect(await card.boundingBox(), `${variant} pressed box`).toEqual(before);
      await page.mouse.up();
      await page.mouse.move(0, 0);
    }
  });
});
