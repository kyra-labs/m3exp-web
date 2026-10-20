import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { runningSpatialAnimations } from './reduced-motion.js';

// Icon button (COMPONENT_SPEC §2): acceptance criteria + light/dark × 3 browsers baselines, axe.
const SIZE_TOKEN = {
  xs: 'x-small',
  s: 'small',
  m: 'medium',
  l: 'large',
  xl: 'x-large',
} as const;
const VARIANTS = ['standard', 'filled', 'tonal', 'outlined'] as const;

const token = (page: Page, name: string) =>
  page.evaluate(
    (n) => Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue(n)),
    name,
  );
const radius = (el: Locator) =>
  el.evaluate((node) => Number.parseFloat(getComputedStyle(node).borderTopLeftRadius));

test.beforeEach(async ({ page }) => {
  await page.goto('/components/icon-button/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByTestId('react-icon-buttons').locator('button')).toHaveCount(4);
});

test('has no axe violations', async ({ page }) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();
  expect(results.violations).toEqual([]);
});

test('matches the visual baseline', async ({ page }) => {
  await expect(page).toHaveScreenshot('icon-button.png', { fullPage: true });
});

test('all 15 size × width boxes match the tokens (±0.5px)', async ({ page }) => {
  for (const [size, name] of Object.entries(SIZE_TOKEN)) {
    const height = await token(page, `--m3e-comp-${name}-icon-button-container-height`);
    const icon = await token(page, `--m3e-comp-${name}-icon-button-icon-size`);
    const uniform = size === 'l' ? 'uniform' : 'default';
    for (const [width, space] of [
      ['narrow', 'narrow'],
      ['default', uniform],
      ['wide', 'wide'],
    ] as const) {
      const leading = await token(page, `--m3e-comp-${name}-icon-button-${space}-leading-space`);
      const box = (await page
        .locator(`[data-width="${width}"] [data-size="${size}"]`)
        .boundingBox())!;
      expect(Math.abs(box.height - height), `${size} ${width} height`).toBeLessThanOrEqual(0.5);
      expect(
        Math.abs(box.width - (icon + 2 * leading)),
        `${size} ${width} width`,
      ).toBeLessThanOrEqual(0.5);
    }
  }
});

test('XS keeps a ≥ 48×48 hit area in both axes', async ({ page }) => {
  // The ::after touch target (probing points would hit neighbors' targets or leave the page).
  for (const width of ['narrow', 'default', 'wide'] as const) {
    const target = await page.locator(`[data-width="${width}"] [data-size="xs"]`).evaluate((el) => {
      const s = getComputedStyle(el, '::after');
      return { w: Number.parseFloat(s.width), h: Number.parseFloat(s.height) };
    });
    expect(target.w, `${width} width`).toBeGreaterThanOrEqual(48);
    expect(target.h, `${width} height`).toBeGreaterThanOrEqual(48);
  }
});

test('CSS press morph settles on the pressed shape token', async ({ page }) => {
  const button = page.locator('[data-width="default"] [data-size="m"]');
  await button.scrollIntoViewIfNeeded();
  const pressed = await token(page, '--m3e-comp-medium-icon-button-container-shape-pressed');
  const box = (await button.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect.poll(() => radius(button), { timeout: 5000 }).toBeCloseTo(pressed, 0);
  await page.mouse.up();
  await expect.poll(() => radius(button), { timeout: 5000 }).toBeCloseTo(box.height / 2, 0);
});

test('toggle: aria-pressed, filled icon and selected shape', async ({ page }) => {
  const toggle = page.getByTestId('react-icon-toggles').locator('button').nth(1);
  await toggle.scrollIntoViewIfNeeded();
  const icon = toggle.locator('.m3e-icon');
  const fill = () => icon.evaluate((el) => getComputedStyle(el).fontVariationSettings);
  expect(await fill()).toContain('"FILL" 0');
  const selected = await token(
    page,
    '--m3e-comp-medium-icon-button-container-shape-round-selected',
  );
  const writes = await toggle.evaluate(async (el) => {
    const out: number[] = [];
    const observer = new MutationObserver(() => {
      out.push(Number.parseFloat((el as HTMLElement).style.borderRadius));
    });
    observer.observe(el, { attributes: true, attributeFilter: ['style'] });
    (el as HTMLElement).click();
    await new Promise((r) => setTimeout(r, 1500));
    observer.disconnect();
    return out;
  });
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  expect(new Set(writes.map((v) => Math.round(v * 10))).size).toBeGreaterThanOrEqual(3);
  await expect.poll(() => radius(toggle), { timeout: 2000 }).toBeCloseTo(selected, 1);
  expect(await fill()).toContain('"FILL" 1');
});

test('keyboard: Enter and Space activate', async ({ page }) => {
  const button = page.getByTestId('react-icon-buttons').locator('button').first();
  await button.focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Space');
  await expect(page.getByText('Pressed 2 times.')).toBeVisible();
});

for (const variant of VARIANTS) {
  test(`states: ${variant}`, async ({ page }) => {
    const button = page.getByTestId('default').locator(`[data-variant="${variant}"]`);
    await button.scrollIntoViewIfNeeded();
    await button.hover();
    await expect(button).toHaveScreenshot(`icon-button-${variant}-hovered.png`);
    await page.mouse.move(0, 0);
    await button.focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await expect(button).toBeFocused();
    const box = (await button.boundingBox())!;
    await expect(page).toHaveScreenshot(`icon-button-${variant}-focused.png`, {
      clip: { x: box.x - 8, y: box.y - 8, width: box.width + 16, height: box.height + 16 },
    });
  });
}

test.describe('forced colors', () => {
  test.use({ forcedColors: 'active' });

  test('every icon button keeps a visible boundary', async ({ page }) => {
    for (const variant of VARIANTS) {
      const style = await page
        .getByTestId('default')
        .locator(`[data-variant="${variant}"]`)
        .evaluate((el) => getComputedStyle(el).borderTopStyle);
      expect(style, variant).toBe('solid');
    }
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  // The toggle's corner morph is an effect (IconButton.kt: the default effects spring), so under
  // reduced motion it runs on the fast effects spring (FOUNDATIONS §4) instead of jumping; nothing
  // spatial moves.
  test('the toggle shape morphs on the fast effects spring; nothing moves', async ({ page }) => {
    const sys = (name: string) =>
      page.evaluate(
        (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(),
        name,
      );
    expect(await sys('--m3e-sys-motion-spring-default-effects-duration')).toBe(
      await sys('--m3e-sys-motion-spring-fast-effects-duration'),
    );
    const toggle = page.getByTestId('react-icon-toggles').locator('button').nth(1);
    await toggle.scrollIntoViewIfNeeded();
    const before = (await toggle.boundingBox())!;
    const selected = await token(
      page,
      '--m3e-comp-medium-icon-button-container-shape-round-selected',
    );
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(await runningSpatialAnimations(page)).toEqual([]);
    await expect.poll(() => radius(toggle), { timeout: 1000 }).toBeCloseTo(selected, 1);
    expect(await toggle.boundingBox()).toEqual(before);
    expect(
      await toggle
        .locator('.m3e-icon')
        .evaluate((el) => getComputedStyle(el).fontVariationSettings),
    ).toContain('"FILL" 1');
  });
});
