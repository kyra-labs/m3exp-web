import AxeBuilder from '@axe-core/playwright';
import { morphSpringDurationMillis } from '@kyralabs/m3e-motion';
import { loadingIndicatorShapes } from '@kyralabs/m3e-shapes';
import { type Locator, type Page, expect, test } from '@playwright/test';

// Loading indicator (COMPONENT_SPEC §7): acceptance + light/dark × 3 browsers baselines, axe.
// Time is frozen with page.clock, so every frame is deterministic; fastForward() jumps to an exact
// time and runs the rAF loop once there.
const INTERVAL = 650; // --m3e-comp-loading-indicator-morph-interval (asserted below)
const TIMING = {
  morphIntervalMillis: INTERVAL,
  rotationDurationMillis: 4666,
  spring: { dampingRatio: 0.6, stiffness: 200 },
  visibilityThreshold: 0.1,
};
const SCALE = 38 / 48;
const START = new Date('2026-01-01T00:00:00Z');

const root = (page: Page, testId: string) =>
  page.getByTestId(testId).locator('[role="progressbar"]');
const pathOf = (indicator: Locator) => indicator.locator('path').getAttribute('d');

/** Same commands; every number within 1e-3 of the expected (engines may differ in sin/cos ulps). */
function expectSamePath(actual: string | null, expected: string, label: string) {
  const parse = (d: string) => d.match(/[MLCZ]|-?\d+(\.\d+)?(e-?\d+)?/g) ?? [];
  const a = parse(actual ?? '');
  const e = parse(expected);
  expect(a.length, `${label}: tokens`).toBe(e.length);
  a.forEach((token, i) => {
    if (/^[MLCZ]$/.test(token)) expect(token, label).toBe(e[i]);
    else
      expect(Math.abs(Number(token) - Number(e[i])), `${label} #${String(i)}`).toBeLessThan(1e-3);
  });
}

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: START });
  await page.clock.pauseAt(new Date(START.getTime() + 1000));
  await page.goto('/components/loading-indicator/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByTestId('react').locator('[role="progressbar"]')).toHaveCount(4);
});

test('has no axe violations', async ({ page }) => {
  // axe schedules work with timers; let time run.
  await page.clock.resume();
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();
  expect(results.violations).toEqual([]);
});

test('matches the visual baseline', async ({ page }) => {
  await expect(page).toHaveScreenshot('loading-indicator.png', { fullPage: true });
});

test('uses the generated choreography tokens', async ({ page }) => {
  // The built CSS is minified (650ms ships as .65s), so compare in ms.
  const ms = (name: string) =>
    page.evaluate((n) => {
      const v = getComputedStyle(document.documentElement).getPropertyValue(n).trim();
      return v.endsWith('ms') ? Number.parseFloat(v) : Number.parseFloat(v) * 1000;
    }, name);
  expect(await ms('--m3e-comp-loading-indicator-morph-interval')).toBeCloseTo(INTERVAL, 6);
  expect(await ms('--m3e-comp-loading-indicator-rotation-duration')).toBeCloseTo(
    TIMING.rotationDurationMillis,
    6,
  );
});

test('morph sequence order matches Compose (path at the start of each segment)', async ({
  page,
}) => {
  const shapes = loadingIndicatorShapes(null, true, SCALE);
  const spring = morphSpringDurationMillis(TIMING);
  expect(spring).toBeLessThan(INTERVAL - 16);
  const indicator = root(page, 'uncontained');
  expectSamePath(await pathOf(indicator), shapes.pathData(0, 0, 100), 'segment 0 @ t=0');
  let now = 0;
  for (let k = 1; k <= 8; k++) {
    // After morph k-1's spring finishes and before the next interval, morph k is held at t = 0.
    const target = k * INTERVAL - 8;
    await page.clock.fastForward(target - now);
    now = target;
    expectSamePath(
      await pathOf(indicator),
      shapes.pathData(k % shapes.morphs.length, 0, 100),
      `segment ${String(k % 7)}`,
    );
  }
});

test('48 / 38 ratio holds at 24 and 240', async ({ page }) => {
  const paths = new Set<string | null>();
  for (const [id, size] of [
    ['size-24', 24],
    ['size-48', 48],
    ['size-240', 240],
  ] as const) {
    const indicator = root(page, id);
    const box = (await indicator.boundingBox())!;
    expect(box.width, id).toBeCloseTo(size, 0);
    expect(box.height, id).toBeCloseTo(size, 0);
    const svg = (await indicator.locator('svg').boundingBox())!;
    expect(svg.width, id).toBeCloseTo(size, 0);
    paths.add(await pathOf(indicator));
  }
  // One drawing, scaled with the container: the shape keeps ActiveSize / ContainerSize.
  expect(paths.size).toBe(1);
});

test('determinate: progressbar values and no auto-rotation', async ({ page }) => {
  const half = page.getByRole('progressbar', { name: 'Progress 50%' });
  await expect(half).toHaveAttribute('aria-valuenow', '50');
  const before = await pathOf(half);
  await page.clock.fastForward(2000);
  expect(await pathOf(half)).toBe(before);
  await page.locator('#progress').fill('0.8');
  await expect(page.getByRole('progressbar', { name: 'Live progress' })).toHaveAttribute(
    'aria-valuenow',
    '80',
  );
});

test('states: indeterminate mid-morph', async ({ page }) => {
  await page.clock.fastForward(2 * INTERVAL + 120);
  await expect(page.getByTestId('indeterminate')).toHaveScreenshot(
    'loading-indicator-morphing.png',
  );
});

test('states: determinate', async ({ page }) => {
  await expect(page.getByTestId('determinate')).toHaveScreenshot(
    'loading-indicator-determinate.png',
  );
});

test('the CSS-only fallback rotates its static shape', async ({ page }) => {
  const shape = page.getByTestId('css').locator('svg');
  expect(await shape.evaluate((el) => getComputedStyle(el).animationName)).toBe(
    'm3e-loading-indicator-rotate',
  );
  // JS-driven indicators never run the CSS rotation.
  const driven = root(page, 'uncontained').locator('svg');
  expect(await driven.evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('holds the first frame; the CSS fallback stops', async ({ page }) => {
    const indicator = root(page, 'uncontained');
    const first = await pathOf(indicator);
    await page.clock.fastForward(3 * INTERVAL);
    expect(await pathOf(indicator)).toBe(first);
    expectSamePath(first, loadingIndicatorShapes(null, true, SCALE).pathData(0, 0, 100), 'first');
    const shape = page.getByTestId('css').locator('svg');
    expect(await shape.evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
  });
});

test.describe('forced colors', () => {
  test.use({ forcedColors: 'active' });

  test('the shape stays visible in the text color', async ({ page }) => {
    const path = root(page, 'contained').locator('path');
    const fill = await path.evaluate((el) => getComputedStyle(el).fill);
    // Compare with CanvasText itself: WebKit's emulation does not force author body colors.
    const canvasText = await page.evaluate(() => {
      const probe = document.createElement('span');
      probe.style.color = 'CanvasText';
      document.body.append(probe);
      const color = getComputedStyle(probe).color;
      probe.remove();
      return color;
    });
    expect(fill).toBe(canvasText);
  });
});
