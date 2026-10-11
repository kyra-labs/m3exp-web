import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';

// Button (COMPONENT_SPEC §1): acceptance criteria + light/dark × 3 browsers baselines, axe.
const SIZE_TOKEN = {
  xs: 'x-small',
  s: 'small',
  m: 'medium',
  l: 'large',
  xl: 'x-large',
} as const;
const VARIANTS = ['filled', 'tonal', 'elevated', 'outlined', 'text'] as const;

const token = (page: Page, name: string) =>
  page.evaluate(
    (n) => Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue(n)),
    name,
  );
const radius = (el: Locator) =>
  el.evaluate((node) => Number.parseFloat(getComputedStyle(node).borderTopLeftRadius));

test.beforeEach(async ({ page }) => {
  await page.goto('/components/button/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByTestId('react-buttons').locator('button')).toHaveCount(5);
});

test('has no axe violations', async ({ page }) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();
  expect(results.violations).toEqual([]);
});

test('matches the visual baseline', async ({ page }) => {
  await expect(page).toHaveScreenshot('button.png', { fullPage: true });
});

test('each size renders the generated container height (±0.5px)', async ({ page }) => {
  for (const [size, name] of Object.entries(SIZE_TOKEN)) {
    const expected = await token(page, `--m3e-comp-button-${name}-container-height`);
    for (const variant of VARIANTS) {
      const box = await page
        .locator(`[data-variant="${variant}"] [data-size="${size}"]`)
        .boundingBox();
      expect(Math.abs(box!.height - expected), `${variant} ${size}`).toBeLessThanOrEqual(0.5);
    }
  }
});

test('XS and S keep a ≥ 48×48 hit area', async ({ page }) => {
  for (const size of ['xs', 's'] as const) {
    const button = page.locator(`[data-variant="filled"] [data-size="${size}"]`);
    await button.scrollIntoViewIfNeeded();
    const box = (await button.boundingBox())!;
    const reach = (48 - box.height) / 2;
    for (const y of [box.y - reach + 1, box.y + box.height + reach - 1]) {
      const hit = await page.evaluate(
        ([x, py]) => document.elementFromPoint(x!, py!)?.closest('.m3e-button')?.textContent,
        [box.x + box.width / 2, y],
      );
      expect(hit, `${size} at y=${String(y)}`).toContain(`filled ${size}`);
    }
  }
});

test('CSS press morph settles on the pressed shape token', async ({ page }) => {
  for (const [size, name] of Object.entries(SIZE_TOKEN)) {
    const button = page.locator(`[data-variant="filled"] [data-size="${size}"]`);
    await button.scrollIntoViewIfNeeded();
    const pressed = await token(page, `--m3e-comp-button-${name}-container-shape-pressed`);
    const box = (await button.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await expect.poll(() => radius(button), { timeout: 5000 }).toBeCloseTo(pressed, 0);
    await page.mouse.up();
    await expect.poll(() => radius(button), { timeout: 5000 }).toBeCloseTo(box.height / 2, 0);
  }
});

test('React press morph springs to the pressed token and back', async ({ page }) => {
  const button = page.getByTestId('react-buttons').locator('button').first();
  await button.scrollIntoViewIfNeeded();
  const pressed = await token(page, '--m3e-comp-button-medium-container-shape-pressed');
  const box = (await button.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect(button).toHaveAttribute('data-pressed', '');
  await expect.poll(() => radius(button), { timeout: 2000 }).toBeCloseTo(pressed, 1);
  await page.mouse.up();
  await expect.poll(() => radius(button), { timeout: 2000 }).toBeCloseTo(box.height / 2, 1);
});

test('toggle selection flips aria-pressed and animates round → square', async ({ page }) => {
  const toggle = page.getByTestId('react-toggles').locator('button').first();
  await toggle.scrollIntoViewIfNeeded();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  const resting = await radius(toggle);
  const selected = await token(page, '--m3e-comp-button-medium-container-shape-square-selected');
  // Select and sample the spring from inside the page (a Playwright click would include a long
  // press first): the radius passes through intermediate values before settling.
  const samples = await toggle.evaluate(async (el) => {
    // Every radius the spring writes (frames can be dropped under load; writes are not).
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
  // A spring writes many intermediate radii; a jump would write one.
  expect(new Set(samples.map((v) => Math.round(v * 10))).size).toBeGreaterThanOrEqual(3);
  await expect.poll(() => radius(toggle), { timeout: 2000 }).toBeCloseTo(selected, 1);
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(() => radius(toggle), { timeout: 2000 }).toBeCloseTo(resting, 1);
});

test('keyboard: Space presses, Enter activates', async ({ page }) => {
  const button = page.getByTestId('react-buttons').locator('button').first();
  await button.focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Space');
  await expect(page.getByText('Pressed 2 times.')).toBeVisible();
  const toggle = page.getByTestId('react-toggles').locator('button').first();
  await toggle.focus();
  await page.keyboard.press('Space');
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
});

for (const variant of VARIANTS) {
  test(`states: ${variant}`, async ({ page }) => {
    const button = page.locator(`[data-variant="${variant}"] [data-size="m"]`);
    await button.scrollIntoViewIfNeeded();
    await button.hover();
    await expect(button).toHaveScreenshot(`button-${variant}-hovered.png`);
    await page.mouse.move(0, 0);
    await button.focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await expect(button).toBeFocused();
    await expect(page).toHaveScreenshot(`button-${variant}-focused.png`, {
      // Room for the outward focus ring.
      clip: await button.boundingBox().then((b) => ({
        x: b!.x - 8,
        y: b!.y - 8,
        width: b!.width + 16,
        height: b!.height + 16,
      })),
    });
  });
}

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('toggle selection jumps (spatial spring off)', async ({ page }) => {
    const toggle = page.getByTestId('react-toggles').locator('button').first();
    await toggle.scrollIntoViewIfNeeded();
    const selected = await token(page, '--m3e-comp-button-medium-container-shape-square-selected');
    await toggle.click();
    const next = await toggle.evaluate(async (el) => {
      await new Promise((r) => requestAnimationFrame(r));
      return Number.parseFloat(getComputedStyle(el).borderTopLeftRadius);
    });
    expect(next).toBeCloseTo(selected, 1);
  });
});

test.describe('forced colors', () => {
  test.use({ forcedColors: 'active' });

  test('every button keeps a visible boundary', async ({ page }) => {
    for (const variant of VARIANTS) {
      const style = await page
        .locator(`[data-variant="${variant}"] [data-size="s"]`)
        .evaluate((el) => getComputedStyle(el).borderTopStyle);
      expect(style, variant).toBe('solid');
    }
  });
});
