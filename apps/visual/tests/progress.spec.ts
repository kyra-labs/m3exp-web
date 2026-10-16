import AxeBuilder from '@axe-core/playwright';
import { cubicBezier, springValue } from '@kyralabs/m3e-motion';
import { type Page, expect, test } from '@playwright/test';

// Progress indicators (COMPONENT_SPEC §8): acceptance + light/dark × 3 browsers baselines, axe.
// JS-drawn (wavy) frames run on page.clock, so every frame is deterministic (runFor() steps 16ms
// frames, so comparisons use whole multiples of 16ms); the CSS-only
// indeterminate indicators are frozen with the Web Animations API (currentTime).
const START = new Date('2026-01-01T00:00:00Z');
const emphasizedAccelerate = cubicBezier(0.3, 0, 0.8, 0.15);

const bar = (page: Page, label: string) =>
  page.getByRole('progressbar', { name: label, exact: true });

/** Pauses the indeterminate CSS animations at `ms` of their cycle; finishes everything else. */
const freezeCss = (page: Page, ms: number) =>
  page.evaluate((t) => {
    for (const a of document.getAnimations()) {
      if ('animationName' in a && (a as CSSAnimation).animationName.startsWith('m3e-progress-')) {
        a.pause();
        a.currentTime = t;
      } else if (a.effect?.getComputedTiming().endTime !== Infinity) {
        a.finish();
      }
    }
  }, ms);

const d = (page: Page, label: string, part = 'indicator') =>
  bar(page, label)
    .locator(`[class$="__wave-${part}"], [class$="__${part}"]`)
    .first()
    .getAttribute('d');

// Many wavy indicators redraw every frame; long clock runs need room on loaded runners.
test.describe.configure({ timeout: 60_000 });

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: START });
  await page.clock.pauseAt(new Date(START.getTime() + 1000));
  await page.goto('/components/progress/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByTestId('react').getByRole('progressbar')).toHaveCount(5);
  // Every element has rendered (and requested its first frame) before the clock moves, so all
  // timelines start on the same frame.
  await page.waitForFunction(() =>
    [...document.querySelectorAll('m3e-linear-progress, m3e-circular-progress')].every(
      (el) => el.firstElementChild?.hasAttribute('data-driven') === true,
    ),
  );
  // One frame so the wavy indicators draw.
  await page.clock.runFor(16);
});

test('has no axe violations', async ({ page }) => {
  await page.clock.resume();
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();
  expect(results.violations).toEqual([]);
});

test('matches the visual baseline (indeterminate frozen at 700ms)', async ({ page }) => {
  await freezeCss(page, 700);
  await page.clock.runFor(700 - 16);
  await expect(page).toHaveScreenshot('progress.png', { fullPage: true, animations: 'allow' });
});

test('matches the indeterminate baseline at 1500ms', async ({ page }) => {
  await freezeCss(page, 1500);
  await page.clock.runFor(1500 - 16);
  for (const id of ['linear-flat', 'circular-flat', 'wavy-linear', 'wavy-circular']) {
    await expect(page.getByTestId(id)).toHaveScreenshot(`progress-${id}-1500.png`, {
      animations: 'allow',
    });
  }
});

test('role="progressbar" with a name, and aria values when determinate', async ({ page }) => {
  const determinate = bar(page, 'Wavy 30%');
  await expect(determinate).toHaveAttribute('aria-valuenow', '30');
  await expect(determinate).toHaveAttribute('aria-valuemin', '0');
  await expect(determinate).toHaveAttribute('aria-valuemax', '100');
  const indeterminate = bar(page, 'Wavy indeterminate');
  await expect(indeterminate).not.toHaveAttribute('aria-valuenow');
  // The element's aria-label moved onto the progress bar.
  await expect(page.locator('m3e-linear-progress[aria-label]')).toHaveCount(0);
});

test('gap = min(progress length, 4dp) between the indicator and the track', async ({ page }) => {
  const box = async (label: string, part: string) =>
    (await bar(page, label).locator(`.m3e-linear-progress__${part}`).boundingBox())!;
  const indicator = await box('Linear 30%', 'indicator');
  const track = await box('Linear 30%', 'track');
  expect(indicator.width).toBeCloseTo(0.3 * 240 + 2, 0);
  expect(track.x - (indicator.x + indicator.width)).toBeCloseTo(4, 0);
  // At 1% (2.4px) the gap shrinks to the progress length: the track starts 2.4px later.
  const small = await box('Linear 1%', 'track');
  const smallIndicator = await box('Linear 1%', 'indicator');
  expect(small.x - smallIndicator.x).toBeCloseTo(2.4 + 2.4 - 2, 0);
});

test('the wave travels one wavelength per second', async ({ page }) => {
  const at = () => d(page, 'Wavy 30%');
  // Frames land every 16ms: 2000ms (125 frames) is two whole wavelengths, 496ms about half one.
  const first = await at();
  await page.clock.runFor(496);
  expect(await at()).not.toBe(first);
  await page.clock.runFor(1504);
  expect(await at()).toBe(first);
});

test('amplitude: no wave at ≤ 10% and ≥ 95%, a wave in between', async ({ page }) => {
  expect(await d(page, 'Wavy 1%')).not.toContain('Q');
  expect(await d(page, 'Wavy 100%')).not.toContain('Q');
  expect(await d(page, 'Wavy 30%')).toContain('Q');
});

test('indeterminate timing: CSS lines run Compose’s keyframes; the wavy circle turns on its own', async ({
  page,
}) => {
  // CSS: the first head runs `0f at 0 using EmphasizedAccelerate` → `1f at 1000`.
  await freezeCss(page, 500);
  const head = await bar(page, 'Linear indeterminate').evaluate((el) =>
    Number(getComputedStyle(el).getPropertyValue('--_m3e-progress-first-head')),
  );
  expect(head).toBeCloseTo(emphasizedAccelerate(0.5), 3);
  // Circular wavy: 1080° per 6s plus a 90° step in the first 300ms, +90° start.
  const rotate = () =>
    bar(page, 'Wavy circular indeterminate')
      .locator('svg')
      .evaluate((el) => Number.parseFloat((el as SVGElement).style.rotate));
  const r0 = await rotate();
  await page.clock.runFor(1504);
  // 1080° × 1504 / 6000 + one 90° step (± the part of a step a frame falls in).
  expect(Math.abs((await rotate()) - r0 - (270.72 + 90))).toBeLessThan(2);
});

test('determinate progress animates on ProgressAnimationSpec (damping 1, stiffness 50)', async ({
  page,
}) => {
  const value = () =>
    bar(page, 'Animated').evaluate((el) =>
      Number(getComputedStyle(el).getPropertyValue('--m3e-comp-progress-indicator-value')),
    );
  expect(await value()).toBeCloseTo(0.1, 5);
  await page.locator('#animate-linear').evaluate((el) => {
    el.setAttribute('value', '0.9');
  });
  await page.clock.runFor(16);
  const start = await page.evaluate(() => performance.now());
  await page.clock.runFor(300);
  const t = (await page.evaluate(() => performance.now())) - start;
  const spec = { dampingRatio: 1, stiffness: 50 };
  // The spring started at the first frame after the change (within one frame of `start`).
  expect(Math.abs((await value()) - springValue(spec, t + 16, 0.1, 0.9, 0))).toBeLessThan(0.03);
  await page.clock.runFor(1696);
  expect(await value()).toBeCloseTo(0.9, 5);
});

test('RTL mirrors linear indicators', async ({ page }) => {
  const root = (await bar(page, 'RTL 40%').boundingBox())!;
  const indicator = (await bar(page, 'RTL 40%')
    .locator('.m3e-linear-progress__indicator')
    .boundingBox())!;
  expect(indicator.x + indicator.width).toBeCloseTo(root.x + root.width, 0);
  const wave = bar(page, 'RTL wavy 40%').locator('svg');
  expect(await wave.evaluate((el) => getComputedStyle(el).rotate)).toBe('180deg');
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the wave holds still and value changes jump', async ({ page }) => {
    const first = await d(page, 'Wavy 30%');
    await page.clock.runFor(250);
    expect(await d(page, 'Wavy 30%')).toBe(first);
    await page.locator('#animate-linear').evaluate((el) => {
      el.setAttribute('value', '0.9');
    });
    await page.clock.runFor(16);
    expect(
      await bar(page, 'Animated').evaluate((el) =>
        getComputedStyle(el).getPropertyValue('--m3e-comp-progress-indicator-value'),
      ),
    ).toBe('0.9');
  });
});

test.describe('forced colors', () => {
  test.use({ forcedColors: 'active' });

  test('track and indicator stay visible', async ({ page }) => {
    const color = (label: string, part: string, prop: string) =>
      bar(page, label)
        .locator(part)
        .first()
        .evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop);
    const transparent = /rgba\(0, 0, 0, 0\)|transparent/;
    expect(
      await color('Linear 30%', '.m3e-linear-progress__track', 'background-color'),
    ).not.toMatch(transparent);
    expect(
      await color('Linear 30%', '.m3e-linear-progress__indicator', 'background-color'),
    ).not.toMatch(transparent);
    expect(await color('Circular 30%', '.m3e-circular-progress__track', 'stroke')).not.toMatch(
      transparent,
    );
    expect(await color('Wavy 30%', '.m3e-linear-progress__wave-track', 'stroke')).not.toMatch(
      transparent,
    );
    await expect(page.getByTestId('linear-flat')).toHaveScreenshot('progress-forced-colors.png');
  });
});
