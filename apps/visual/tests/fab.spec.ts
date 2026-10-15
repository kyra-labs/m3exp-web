import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';

// FAB and extended FAB (COMPONENT_SPEC §5): acceptance criteria + light/dark × 3 browsers
// baselines, axe, and the interruptible width spring (ROADMAP M5 DoD).
const FAB_SIZES = {
  baseline: { token: 'fab-baseline', shape: '--m3e-comp-fab-baseline-container-shape' },
  medium: { token: 'fab-medium', shape: '--m3e-comp-fab-defaults-medium-shape' },
  large: { token: 'fab-large', shape: '--m3e-comp-fab-large-container-shape' },
} as const;
const FAB_ICONS = {
  baseline: '--m3e-comp-fab-baseline-icon-size',
  medium: '--m3e-comp-fab-medium-icon-size',
  large: '--m3e-comp-fab-defaults-large-icon-size',
} as const;
const EXTENDED_SIZES = {
  small: {
    height: '--m3e-comp-extended-fab-small-container-height',
    shape: '--m3e-comp-extended-fab-small-container-shape',
  },
  medium: {
    height: '--m3e-comp-extended-fab-medium-container-height',
    shape: '--m3e-comp-fab-defaults-medium-extended-shape',
  },
  large: {
    height: '--m3e-comp-extended-fab-large-container-height',
    shape: '--m3e-comp-extended-fab-large-container-shape',
  },
} as const;
const COLORS = [
  'primary-container',
  'secondary-container',
  'tertiary-container',
  'primary',
  'secondary',
  'tertiary',
] as const;

const token = (page: Page, name: string) =>
  page.evaluate(
    (n) => Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue(n)),
    name,
  );
const radius = (el: Locator) =>
  el.evaluate((node) => Number.parseFloat(getComputedStyle(node).borderTopLeftRadius));
const width = (el: Locator) => el.evaluate((node) => node.getBoundingClientRect().width);

test.beforeEach(async ({ page }) => {
  await page.goto('/components/fab/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByTestId('react-extended').locator('button')).toHaveCount(3);
});

test('has no axe violations', async ({ page }) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();
  expect(results.violations).toEqual([]);
});

test('matches the visual baseline', async ({ page }) => {
  await expect(page).toHaveScreenshot('fab.png', { fullPage: true });
});

test('FAB sizes, radii and icons match the generated tokens (±0.5px)', async ({ page }) => {
  for (const [size, { token: name, shape }] of Object.entries(FAB_SIZES)) {
    const fab = page.locator(`[data-testid="sizes"] [data-size="${size}"]`);
    const box = (await fab.boundingBox())!;
    expect(
      Math.abs(box.height - (await token(page, `--m3e-comp-${name}-container-height`))),
    ).toBeLessThanOrEqual(0.5);
    expect(
      Math.abs(box.width - (await token(page, `--m3e-comp-${name}-container-width`))),
    ).toBeLessThanOrEqual(0.5);
    expect(await radius(fab), size).toBeCloseTo(await token(page, shape), 1);
    const icon = (await fab.locator('.m3e-icon').boundingBox())!;
    expect(icon.width, `${size} icon`).toBeCloseTo(
      await token(page, FAB_ICONS[size as keyof typeof FAB_ICONS]),
      1,
    );
  }
  const small = page.getByTestId('small').locator('button');
  const box = (await small.boundingBox())!;
  expect(box.height).toBeCloseTo(await token(page, '--m3e-comp-fab-small-container-height'), 1);
  expect(await radius(small)).toBeCloseTo(
    await token(page, '--m3e-comp-fab-small-container-shape'),
    1,
  );
});

test('extended FAB heights and radii match; collapsed = container height square', async ({
  page,
}) => {
  for (const [size, { height, shape }] of Object.entries(EXTENDED_SIZES)) {
    const expected = await token(page, height);
    const expanded = page.locator(`[data-testid="extended-sizes"] [data-size="${size}"]`);
    const collapsed = page.locator(`[data-testid="extended-collapsed"] [data-size="${size}"]`);
    const open = (await expanded.boundingBox())!;
    expect(Math.abs(open.height - expected), size).toBeLessThanOrEqual(0.5);
    expect(open.width, size).toBeGreaterThan(expected);
    expect(await radius(expanded), size).toBeCloseTo(await token(page, shape), 1);
    const closed = (await collapsed.boundingBox())!;
    expect(Math.abs(closed.width - expected), `${size} collapsed`).toBeLessThanOrEqual(0.5);
    expect(Math.abs(closed.height - expected), `${size} collapsed`).toBeLessThanOrEqual(0.5);
    // The label stays the accessible name while hidden.
    await expect(collapsed).toHaveAccessibleName(`Create ${size}`);
  }
});

test('small FAB (deprecated) keeps a ≥ 48×48 hit area', async ({ page }) => {
  const fab = page.getByTestId('small').locator('button');
  await fab.scrollIntoViewIfNeeded();
  const box = (await fab.boundingBox())!;
  const reach = (48 - box.height) / 2;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  for (const [x, y] of [
    [cx, box.y - reach + 1],
    [cx, box.y + box.height + reach - 1],
    [box.x - reach + 1, cy],
    [box.x + box.width + reach - 1, cy],
  ] as const) {
    const hit = await page.evaluate(
      ([px, py]) =>
        document.elementFromPoint(px, py)?.closest('.m3e-fab')?.getAttribute('aria-label'),
      [x, y] as const,
    );
    expect(hit, `at ${String(x)},${String(y)}`).toBe('Create (small)');
  }
  await expect(page.locator('[data-deprecated] .docs-deprecated')).toBeVisible();
});

test.describe('width spring (frames driven by the Playwright clock)', () => {
  // Fake timers make the trace deterministic: every requestAnimationFrame and performance.now()
  // the spring sees comes from page.clock, so a loaded CI machine cannot drop frames.
  test.beforeEach(async ({ page }) => {
    await page.clock.install();
    await page.reload();
    await expect(page.getByTestId('react-extended').locator('button')).toHaveCount(3);
  });

  /**
   * Toggles the React extended FABs, then records the medium one's width once per 16ms frame for
   * `frames` frames, toggling again after `reverseAt` frames. The recorder runs in the page's own
   * requestAnimationFrame (after the spring's write), so one runFor() replays the whole trace.
   */
  async function trace(page: Page, frames: number, reverseAt = -1) {
    // Freeze time (install() lets it flow): from here on only runFor() advances it.
    // (The margin keeps the target in the future on a slow runner.)
    await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 10_000);
    await page.evaluate(
      ([n, reverse]) => {
        const fab = document.querySelector('[data-testid="react-extended"] [data-size="medium"]')!;
        const toggle = () => {
          document.querySelector<HTMLElement>('[data-testid="react-extended-toggle"]')!.click();
        };
        const out: number[] = [];
        (window as unknown as { fabTrace: number[] }).fabTrace = out;
        const frame = () => {
          out.push(fab.getBoundingClientRect().width);
          if (out.length === reverse) toggle();
          if (out.length < n) requestAnimationFrame(frame);
        };
        toggle();
        // After React has flushed the toggle and the spring has asked for its frame, so the
        // recorder reads each frame after the spring writes it.
        queueMicrotask(() => requestAnimationFrame(frame));
      },
      [frames, reverseAt] as const,
    );
    await page.clock.runFor(16 * frames + 100);
    return page.evaluate(() => (window as unknown as { fabTrace: number[] }).fabTrace);
  }

  test('React extended FAB collapses and expands with a width spring', async ({ page }) => {
    const fab = page.getByTestId('react-extended').locator('[data-size="medium"]');
    await fab.scrollIntoViewIfNeeded();
    const height = await token(page, '--m3e-comp-extended-fab-medium-container-height');
    const open = await width(fab);
    const closing = await trace(page, 60);
    await expect(fab).toHaveClass(/m3e-extended-fab--collapsed/);
    // A spring passes through many intermediate widths; a jump would show one.
    expect(new Set(closing.slice(0, 15).map(Math.round)).size).toBeGreaterThanOrEqual(5);
    expect(closing[0]!).toBeLessThan(open);
    expect(closing[0]!).toBeGreaterThan(height);
    expect(closing.at(-1)!).toBeCloseTo(height, 0);
    await expect(fab).toHaveAccessibleName('Create');
    // Settled: the inline styles are gone, m3e-css holds the collapsed layout.
    expect(
      await fab.evaluate((el) => (el as HTMLElement).style.getPropertyValue('inline-size')),
    ).toBe('');
    const opening = await trace(page, 60);
    await expect(fab).not.toHaveClass(/m3e-extended-fab--collapsed/);
    expect(new Set(opening.slice(0, 15).map(Math.round)).size).toBeGreaterThanOrEqual(5);
    expect(opening.at(-1)!).toBeCloseTo(open, 0);
  });

  test('the width spring is interruptible and keeps its velocity (trace)', async ({ page }) => {
    const fab = page.getByTestId('react-extended').locator('[data-size="medium"]');
    await fab.scrollIntoViewIfNeeded();
    const open = await width(fab);
    const height = await token(page, '--m3e-comp-extended-fab-medium-container-height');
    const range = open - height;
    // Collapse, then expand again before frame 4 (mid-flight).
    const widths = await trace(page, 60, 4);
    const last = widths[3]!;
    expect(last, 'reversed mid-flight').toBeLessThan(open - range * 0.1);
    expect(last, 'reversed mid-flight').toBeGreaterThan(height + range * 0.1);
    // Velocity kept: the frame after the reversal is still shrinking, then the width turns around.
    expect(widths[4]!, 'continues in the old direction').toBeLessThan(last);
    const turn = widths.indexOf(Math.min(...widths));
    expect(turn).toBeGreaterThanOrEqual(4);
    expect(widths.at(-1)!).toBeCloseTo(open, 0);
    // No jump anywhere: a restart would snap to an endpoint.
    for (let i = 1; i < widths.length; i++) {
      expect(Math.abs(widths[i]! - widths[i - 1]!), `frame ${String(i)}`).toBeLessThan(range * 0.4);
    }
    await expect(fab).not.toHaveClass(/m3e-extended-fab--collapsed/);
  });
});

test('scroll-driven collapse (useExtendedFabScroll)', async ({ page }) => {
  const scroller = page.getByTestId('scroll-demo');
  const fab = page.getByTestId('scroll-fab');
  await scroller.scrollIntoViewIfNeeded();
  await expect(fab).not.toHaveClass(/--collapsed/);
  await scroller.evaluate((el) => {
    el.scrollTop = 200;
  });
  await expect(fab).toHaveClass(/m3e-extended-fab--collapsed/);
  await scroller.evaluate((el) => {
    el.scrollTop = 150;
  });
  await expect(fab).not.toHaveClass(/--collapsed/);
});

test('keyboard: Enter and Space press a FAB; Space toggles the extended FAB', async ({ page }) => {
  const fab = page.getByTestId('react-fabs').locator('button').first();
  await fab.focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Space');
  await expect(page.getByText('Pressed 2 times.')).toBeVisible();
  const toggle = page.getByTestId('react-extended-toggle');
  await toggle.focus();
  await page.keyboard.press('Space');
  await expect(page.getByTestId('react-extended').locator('button').first()).toHaveClass(
    /--collapsed/,
  );
});

test('RTL: the icon leads at the inline start and the label collapses toward it', async ({
  page,
}) => {
  const fab = page.locator('[data-testid="extended-sizes"] [data-size="small"]');
  await fab.evaluate((el) => {
    el.setAttribute('dir', 'rtl');
  });
  const icon = (await fab.locator('.m3e-icon').boundingBox())!;
  const label = (await fab.locator('.m3e-extended-fab__label').boundingBox())!;
  const box = (await fab.boundingBox())!;
  expect(icon.x).toBeGreaterThan(label.x);
  const leading = await token(page, '--m3e-comp-extended-fab-small-leading-space');
  expect(box.x + box.width - (icon.x + icon.width)).toBeCloseTo(leading, 0);
});

for (const [name, selector] of [
  ['fab', '[data-testid="sizes"] [data-size="baseline"]'],
  ['extended-fab', '[data-testid="extended-sizes"] [data-size="small"]'],
] as const) {
  test(`states: ${name}`, async ({ page }) => {
    const fab = page.locator(selector);
    await fab.scrollIntoViewIfNeeded();
    const clip = await fab.boundingBox().then((b) => ({
      x: b!.x - 16,
      y: b!.y - 16,
      width: b!.width + 32,
      height: b!.height + 32,
    }));
    await fab.hover();
    await expect(page).toHaveScreenshot(`${name}-hovered.png`, { clip });
    await page.mouse.move(0, 0);
    await fab.focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await expect(fab).toBeFocused();
    await expect(page).toHaveScreenshot(`${name}-focused.png`, { clip });
  });
}

test('every color style pairs the container with its on-color', async ({ page }) => {
  for (const color of COLORS) {
    const fab = page.locator(`[data-testid="colors"] [data-color="${color}"]`);
    const [bg, fg] = await fab.evaluate((el) => {
      const cs = getComputedStyle(el);
      return [cs.backgroundColor, cs.color];
    });
    const expected = await page.evaluate((r) => {
      const probe = document.createElement('div');
      probe.style.backgroundColor = `var(--m3e-sys-color-${r})`;
      probe.style.color = `var(--m3e-sys-color-on-${r})`;
      document.body.append(probe);
      const cs = getComputedStyle(probe);
      const out = [cs.backgroundColor, cs.color];
      probe.remove();
      return out;
    }, color);
    expect([bg, fg], color).toEqual(expected);
  }
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('collapse jumps (spatial spring off)', async ({ page }) => {
    const fab = page.getByTestId('react-extended').locator('[data-size="medium"]');
    await fab.scrollIntoViewIfNeeded();
    const height = await token(page, '--m3e-comp-extended-fab-medium-container-height');
    const next = await fab.evaluate(async (el) => {
      document.querySelector<HTMLElement>('[data-testid="react-extended-toggle"]')!.click();
      await new Promise((r) => requestAnimationFrame(r));
      await new Promise((r) => requestAnimationFrame(r));
      return el.getBoundingClientRect().width;
    });
    expect(next).toBeCloseTo(height, 0);
  });
});

test.describe('forced colors', () => {
  test.use({ forcedColors: 'active' });

  test('every FAB keeps a visible boundary', async ({ page }) => {
    for (const selector of ['.m3e-fab', '.m3e-extended-fab']) {
      const style = await page
        .locator(selector)
        .first()
        .evaluate((el) => getComputedStyle(el).borderTopStyle);
      expect(style, selector).toBe('solid');
    }
  });
});
