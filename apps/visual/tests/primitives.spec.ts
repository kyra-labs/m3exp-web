import AxeBuilder from '@axe-core/playwright';
import { type Page, expect, test } from '@playwright/test';

// Primitives (COMPONENT_SPEC §39): surface, icon, state layer, focus ring.
// Every state × light/dark × 3 browsers (projects in playwright.config.ts), axe-clean.
test.describe('primitives', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/components/primitives/');
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('m3e-icon .m3e-icon').first()).toHaveText('home');
  });

  test('has no axe violations', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('matches the visual baseline', async ({ page }) => {
    await expect(page).toHaveScreenshot('primitives.png', { fullPage: true });
  });

  const demo = (page: Page) => page.locator('#state-demo');
  const tile = (page: Page, n: number) => demo(page).locator('button').nth(n);

  test('state: hovered', async ({ page }) => {
    await tile(page, 0).hover();
    await expect(demo(page)).toHaveScreenshot('primitives-hovered.png');
  });

  test('state: keyboard focus shows the ring and focus layer', async ({ page }) => {
    await tile(page, 0).focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    await expect(tile(page, 0)).toBeFocused();
    await expect(demo(page)).toHaveScreenshot('primitives-focused.png');
  });

  test('state: inward focus ring', async ({ page }) => {
    await tile(page, 2).focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await expect(demo(page)).toHaveScreenshot('primitives-focused-inward.png');
  });

  test('state: pressed (ripple from the press point)', async ({ page }) => {
    // page.mouse does not scroll; the demo sits below the fold.
    await tile(page, 1).scrollIntoViewIfNeeded();
    const box = (await tile(page, 1).boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.25);
    await page.mouse.down();
    await expect(tile(page, 1)).toHaveAttribute('data-pressed', '');
    await expect(demo(page)).toHaveScreenshot('primitives-pressed.png');
    await page.mouse.up();
    await expect(tile(page, 1)).not.toHaveAttribute('data-pressed', '');
  });

  test('plain HTML: attachAutoRipple ripples a button from the press point', async ({ page }) => {
    const demo = page.locator('#auto-ripple-demo');
    const button = demo.locator('.m3e-button');
    await button.scrollIntoViewIfNeeded();
    const box = (await button.boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.25, box.y + box.height / 2);
    await page.mouse.down();
    await expect(button).toHaveAttribute('data-pressed', '');
    await expect(button).toHaveAttribute('data-ripple', '');
    const x = await button.evaluate((el) => el.style.getPropertyValue('--_m3e-ripple-x'));
    // Firefox reports whole-pixel pointer coordinates.
    expect(Math.abs(Number.parseFloat(x) - box.width * 0.25)).toBeLessThanOrEqual(1);
    await expect(demo).toHaveScreenshot('primitives-auto-ripple-pressed.png');
    await page.mouse.up();
    await expect(button).not.toHaveAttribute('data-pressed', '');
    // data-ripple goes with the press, so the hover overlay keeps its flat shape.
    await expect(button).not.toHaveAttribute('data-ripple', '');
    const image = await button.evaluate((el) => getComputedStyle(el, '::before').backgroundImage);
    expect(image).toBe('none');
  });

  test('plain HTML: a card action press ripples the card', async ({ page }) => {
    const card = page.locator('#auto-ripple-demo .m3e-card');
    const action = card.locator('.m3e-card__action');
    await card.scrollIntoViewIfNeeded();
    const box = (await card.boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.75);
    await page.mouse.down();
    await expect(card).toHaveAttribute('data-pressed', '');
    await expect(action).not.toHaveAttribute('data-pressed', '');
    await page.mouse.up();
    await expect(card).not.toHaveAttribute('data-pressed', '');
  });

  test('a mouse click never shows the focus ring', async ({ page }) => {
    await tile(page, 0).click();
    const outline = await tile(page, 0).evaluate((el) => getComputedStyle(el).outlineStyle);
    expect(outline).toBe('none');
  });

  test('disabled tiles draw no state layer', async ({ page }) => {
    await tile(page, 3).hover();
    const display = await tile(page, 3).evaluate((el) => getComputedStyle(el, '::before').display);
    expect(display).toBe('none');
  });

  test('<m3e-icon fill> renders FILL 1 through the subset font', async ({ page }) => {
    const filled = page.locator('m3e-icon[fill] .m3e-icon').first();
    await expect(filled).toHaveAttribute('data-fill', '');
    const settings = await filled.evaluate((el) => getComputedStyle(el).fontVariationSettings);
    expect(settings).toContain('"FILL" 1');
    expect(await page.evaluate(() => document.fonts.check('24px "M3E Docs Icons"'))).toBe(true);
  });
});

test.describe('primitives under forced colors', () => {
  test.use({ forcedColors: 'active' });

  test('elevated surfaces keep a visible boundary', async ({ page }) => {
    await page.goto('/components/primitives/');
    const border = await page
      .locator('.m3e-surface--elevation-2')
      .evaluate((el) => getComputedStyle(el).borderTopStyle);
    expect(border).toBe('solid');
  });
});

test.describe('primitives with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('state layers use the fast effects spring', async ({ page }) => {
    await page.goto('/components/primitives/');
    const reduced = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      return [
        root.getPropertyValue('--m3e-sys-motion-spring-default-effects-duration').trim(),
        root.getPropertyValue('--m3e-sys-motion-spring-fast-effects-duration').trim(),
      ];
    });
    expect(reduced[0]).toBe(reduced[1]);
  });
});
