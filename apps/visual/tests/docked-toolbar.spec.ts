import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { springValue } from '@kyralabs/m3e-motion';

// Docked toolbar (COMPONENT_SPEC §10) and the deprecated BottomAppBar (D4): acceptance criteria +
// light/dark × 3 browsers baselines of every arrangement (static CSS), the exit-always bar scrolled
// (shown) and hidden, axe, roving focus for both JS layers, and the snap spring traced frame by
// frame on the Playwright clock.
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

const token = (page: Page, name: string) =>
  page.evaluate(
    (n) => Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue(n)),
    name,
  );
const box = async (el: Locator) => (await el.boundingBox())!;

/** The bar of a test id (the element's rendered root, or the React / static root itself). */
const bar = (page: Page, id: string) =>
  page.locator(
    `[data-testid="${id}"]:is(.m3e-docked-toolbar, .m3e-bottom-app-bar), [data-testid="${id}"] > .m3e-docked-toolbar`,
  );

const offsetOf = (el: Locator, property = '--_m3e-docked-toolbar-offset') =>
  el.evaluate(
    (node, p) => Number.parseFloat((node as HTMLElement).style.getPropertyValue(p) || '0'),
    property,
  );

const scrollTo = (scroller: Locator, top: number) =>
  scroller.evaluate((el, t) => {
    el.scrollTo({ top: t });
  }, top);

test.beforeEach(async ({ page }) => {
  await page.goto('/components/docked-toolbar/');
  await page.evaluate(() => document.fonts.ready);
  await expect(bar(page, 'element-toolbar')).toHaveAttribute('data-scroll-behavior', 'exit-always');
  await expect(bar(page, 'react-toolbar')).toHaveAttribute('data-scroll-behavior', 'exit-always');
  await expect(bar(page, 'legacy-react')).toHaveAttribute('data-scroll-behavior', 'exit-always');
});

test('has no axe violations (shown and hidden)', async ({ page }) => {
  expect((await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()).violations).toEqual([]);
  const scroller = page.getByTestId('element-scroller');
  await scrollTo(scroller, 400);
  await expect.poll(() => offsetOf(bar(page, 'element-toolbar'))).toBe(-64);
  expect((await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()).violations).toEqual([]);
});

test('matches the visual baseline', async ({ page }) => {
  await expect(page).toHaveScreenshot('docked-toolbar.png', { fullPage: true });
});

test('measurements match the generated tokens (64dp, 16dp ends, 32dp center spacing, 48dp slots)', async ({
  page,
}) => {
  const height = await token(page, '--m3e-comp-docked-toolbar-defaults-container-height');
  const start = await token(page, '--m3e-comp-docked-toolbar-defaults-content-padding-start');
  const end = await token(page, '--m3e-comp-docked-toolbar-defaults-content-padding-end');
  const spacing = await token(page, '--m3e-comp-docked-toolbar-defaults-fixed-item-spacing');
  const slot = await token(page, '--m3e-comp-minimum-interactive-component-size');
  expect([height, start, end, spacing, slot]).toEqual([64, 16, 16, 32, 48]);

  // Spread: the first and last 48dp slots keep the 16dp ends (40dp buttons 4dp inside them).
  const spread = bar(page, 'static-spread');
  const s = await box(spread);
  expect(s.height).toBeCloseTo(height, 0);
  const sb = spread.locator('button');
  const first = await box(sb.first());
  const last = await box(sb.last());
  expect(first.x - (slot - first.width) / 2 - s.x).toBeCloseTo(start, 0);
  expect(s.x + s.width - (last.x + last.width + (slot - last.width) / 2)).toBeCloseTo(end, 0);
  expect(first.y - s.y).toBeCloseTo((height - first.height) / 2, 0);

  // Center: neighbouring slots 32dp apart, the group centered.
  const center = bar(page, 'static-center');
  const c = await box(center);
  const cb = center.locator('button');
  const a = await box(cb.nth(0));
  const b = await box(cb.nth(1));
  expect(b.x - (a.x + a.width) - (slot - a.width)).toBeCloseTo(spacing, 0);
  const cl = await box(cb.first());
  const cr = await box(cb.last());
  const left = cl.x - (slot - cl.width) / 2 - c.x;
  const right = c.x + c.width - (cr.x + cr.width + (slot - cr.width) / 2);
  expect(left).toBeCloseTo(right, 0);

  // Space around / evenly: no horizontal padding (the Compose samples).
  for (const id of ['static-space-around', 'static-space-evenly']) {
    const padding = await bar(page, id).evaluate((el) =>
      Number.parseFloat(getComputedStyle(el).paddingInlineStart),
    );
    expect(padding, id).toBe(0);
  }

  // No corner radius, no shadow; surface container / on surface, vibrant primary container.
  const style = await spread.evaluate((el) => {
    const cs = getComputedStyle(el);
    return { radius: cs.borderTopLeftRadius, shadow: cs.boxShadow, bg: cs.backgroundColor };
  });
  expect(style.radius).toBe('0px');
  expect(style.shadow).toBe('none');
  const roles = await page.evaluate(() => {
    const probe = document.createElement('div');
    document.body.append(probe);
    const color = (v: string) => {
      probe.style.backgroundColor = `var(${v})`;
      return getComputedStyle(probe).backgroundColor;
    };
    const out = {
      surfaceContainer: color('--m3e-sys-color-surface-container'),
      primaryContainer: color('--m3e-sys-color-primary-container'),
      secondaryContainer: color('--m3e-sys-color-secondary-container'),
    };
    probe.remove();
    return out;
  });
  expect(style.bg).toBe(roles.surfaceContainer);
  expect(
    await bar(page, 'static-vibrant').evaluate((el) => getComputedStyle(el).backgroundColor),
  ).toBe(roles.primaryContainer);

  // Legacy bottom app bar: 80dp, actions 4dp + slot inset from the start, FAB 12dp below the top
  // (4 + 8) and 16dp from the end (4 + 12), secondary container, no shadow.
  const legacy = bar(page, 'legacy-static');
  const l = await box(legacy);
  expect(l.height).toBeCloseTo(80, 0);
  const action = await box(legacy.locator('.m3e-icon-button').first());
  expect(action.x - (slot - action.width) / 2 - l.x).toBeCloseTo(4, 0);
  const fab = legacy.locator('.m3e-fab');
  const f = await box(fab);
  expect(f.y - l.y).toBeCloseTo(12, 0);
  expect(l.x + l.width - (f.x + f.width)).toBeCloseTo(16, 0);
  const fabStyle = await fab.evaluate((el) => {
    const cs = getComputedStyle(el);
    return { bg: cs.backgroundColor, shadow: cs.boxShadow };
  });
  expect(fabStyle.bg).toBe(roles.secondaryContainer);
  expect(fabStyle.shadow).toBe('none');
  await expect(page.locator('[data-deprecated] .docs-deprecated')).toContainText('D4');
});

for (const [layer, id] of [
  ['element', 'element-toolbar'],
  ['react', 'react-toolbar'],
  ['legacy react', 'legacy-react'],
] as const) {
  test(`${layer}: role="toolbar", one tab stop, arrows (no wrap), Home/End`, async ({ page }) => {
    const tb = bar(page, id);
    await expect(tb).toHaveAttribute('role', 'toolbar');
    const items = tb.locator('button');
    const count = await items.count();
    await expect(tb.locator('button[tabindex="0"]')).toHaveCount(1);
    await items.first().focus();
    await page.keyboard.press('ArrowRight');
    await expect(items.nth(1)).toBeFocused();
    await expect(items.nth(1)).toHaveAttribute('tabindex', '0');
    await page.keyboard.press('End');
    await expect(items.nth(count - 1)).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(items.nth(count - 1)).toBeFocused();
    await page.keyboard.press('Home');
    await expect(items.first()).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(items.first()).toBeFocused();
    // Shift+Tab leaves the toolbar (to its scrolling region; the legacy bar is the last tab stop
    // of the page, where Firefox keeps focus on Tab); Tab comes back to the last focused item.
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Shift+Tab');
    expect(await tb.evaluate((el) => el.contains(document.activeElement))).toBe(false);
    await page.keyboard.press('Tab');
    await expect(items.nth(1)).toBeFocused();
  });
}

test('exitAlways: hides on scroll down, shows on scroll up (element; scrolled and hidden baselines)', async ({
  page,
}) => {
  const frame = page.getByTestId('element-frame');
  const scroller = page.getByTestId('element-scroller');
  const tb = bar(page, 'element-toolbar');
  await frame.scrollIntoViewIfNeeded();
  const f = await box(frame);
  // Scroll down past the bar height: fully hidden below the frame.
  await scrollTo(scroller, 300);
  await expect.poll(() => offsetOf(tb)).toBe(-64);
  await expect.poll(async () => (await box(tb)).y).toBeGreaterThanOrEqual(f.y + f.height - 2);
  await expect(page).toHaveScreenshot('docked-toolbar-element-hidden.png', { clip: f });
  // Scroll up by more than the bar height: shown again over scrolled content.
  await scrollTo(scroller, 200);
  await expect.poll(() => offsetOf(tb)).toBe(0);
  expect((await box(tb)).y + 64).toBeCloseTo(f.y + f.height - 1, 0);
  await expect(page).toHaveScreenshot('docked-toolbar-element-scrolled.png', { clip: f });
  // A partial scroll snaps when scrolling ends: shown below half, hidden from half.
  await scrollTo(scroller, 220);
  await expect.poll(() => offsetOf(tb)).toBe(0);
  await scrollTo(scroller, 260);
  await expect.poll(() => offsetOf(tb)).toBe(-64);
  // The bar stays in the tab order; focusing it brings it back.
  await tb.locator('button[tabindex="0"]').focus();
  await expect.poll(() => offsetOf(tb)).toBe(0);
});

test('exitAlways: React docked toolbar and deprecated BottomAppBar hide by their height', async ({
  page,
}) => {
  const react = bar(page, 'react-toolbar');
  await scrollTo(page.getByTestId('react-scroller'), 300);
  await expect.poll(() => offsetOf(react)).toBe(-64);
  const legacy = bar(page, 'legacy-react');
  await scrollTo(page.getByTestId('legacy-scroller'), 300);
  await expect.poll(() => offsetOf(legacy, '--_m3e-bottom-app-bar-offset')).toBe(-80);
  await scrollTo(page.getByTestId('legacy-scroller'), 100);
  await expect.poll(() => offsetOf(legacy, '--_m3e-bottom-app-bar-offset')).toBe(0);
});

test('React: switching the arrangement updates the contract', async ({ page }) => {
  const tb = bar(page, 'react-toolbar');
  await expect(tb).toHaveClass(/m3e-docked-toolbar/);
  await expect(tb).not.toHaveClass(/m3e-docked-toolbar--/);
  await page.getByTestId('react-arrangement').selectOption('center');
  await expect(tb).toHaveClass(/m3e-docked-toolbar--center/);
  await page.getByTestId('react-arrangement').selectOption('space-evenly');
  await expect(tb).toHaveClass(/m3e-docked-toolbar--space-evenly/);
});

test.describe('snap spring (frames driven by the Playwright clock)', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install();
    await page.reload();
    await expect(bar(page, 'element-toolbar')).toHaveAttribute(
      'data-scroll-behavior',
      'exit-always',
    );
  });

  /**
   * Scrolls the element demo to `top` (which ends the scroll and starts the snap), then records the
   * bar offset once per 16ms frame; after `focusAt` frames it focuses the bar (retargets to 0).
   */
  async function trace(page: Page, top: number, frames: number, focusAt = -1) {
    await page.getByTestId('element-frame').scrollIntoViewIfNeeded();
    await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 10_000);
    await page.evaluate(
      ([t, n, focus]) => {
        const scroller = document.querySelector<HTMLElement>('[data-testid="element-scroller"]')!;
        const tb = document.querySelector<HTMLElement>('[data-testid="element-toolbar"] > div')!;
        const out: number[] = [];
        (window as unknown as { snapTrace: number[] }).snapTrace = out;
        const frame = () => {
          out.push(
            Number.parseFloat(tb.style.getPropertyValue('--_m3e-docked-toolbar-offset') || '0'),
          );
          if (out.length === focus) tb.querySelector<HTMLElement>('button')!.focus();
          if (out.length < n) requestAnimationFrame(frame);
        };
        scroller.scrollTop = t;
        scroller.dispatchEvent(new Event('scroll'));
        scroller.dispatchEvent(new Event('scrollend'));
        requestAnimationFrame(frame);
      },
      [top, frames, focusAt] as const,
    );
    await page.clock.runFor(16 * frames + 100);
    return page.evaluate(() => (window as unknown as { snapTrace: number[] }).snapTrace);
  }

  test('a partly hidden bar snaps on the fast spatial spring over many frames, coerced at 0', async ({
    page,
  }) => {
    const offsets = await trace(page, 20, 40);
    expect(offsets[0]!).toBeGreaterThan(-20);
    expect(offsets[0]!).toBeLessThan(0);
    expect(new Set(offsets.slice(0, 10).map((o) => o.toFixed(1))).size).toBeGreaterThanOrEqual(4);
    // Fast spatial overshoots; the offset is coerced (BottomAppBarState.heightOffset setter).
    expect(Math.max(...offsets)).toBe(0);
    expect(offsets.at(-1)).toBe(0);
  });

  test('focus during a hiding snap retargets to shown and keeps the velocity (trace)', async ({
    page,
  }) => {
    const spec = {
      dampingRatio: await token(page, '--m3e-sys-motion-spring-fast-spatial-damping-ratio'),
      stiffness: await token(page, '--m3e-sys-motion-spring-fast-spatial-stiffness'),
    };
    const offsets = await trace(page, 40, 50, 3);
    const at = offsets[2]!;
    expect(at, 'hiding in flight').toBeLessThan(-40);
    expect(at).toBeGreaterThan(-64);
    // Velocity kept: the downward velocity holds the first frame after the retarget well below
    // what the same spring would move from rest (Compose Animatable semantics).
    const fromRest = springValue(spec, 16, at, 0) - at;
    expect(fromRest).toBeGreaterThan(2);
    expect(offsets[3]! - at, 'first frame after the retarget').toBeLessThan(fromRest / 2);
    for (let i = 1; i < offsets.length; i++)
      expect(Math.abs(offsets[i]! - offsets[i - 1]!), `frame ${String(i)}`).toBeLessThan(20);
    expect(offsets.at(-1)).toBe(0);
  });
});

test('touch targets: every item sits in a ≥ 48dp slot', async ({ page }) => {
  for (const id of ['static-spread', 'static-center', 'legacy-static']) {
    const buttons = bar(page, id).locator('.m3e-icon-button');
    const a = await box(buttons.nth(0));
    const b = await box(buttons.nth(1));
    expect(b.x - a.x, id).toBeGreaterThanOrEqual(48);
  }
});

test('RTL: the items and the legacy FAB mirror (logical properties)', async ({ page }) => {
  const spread = bar(page, 'static-spread');
  await spread.evaluate((el) => {
    el.setAttribute('dir', 'rtl');
  });
  const s = await box(spread);
  const items = spread.locator('button');
  const first = await box(items.first());
  expect(first.x).toBeGreaterThan((await box(items.nth(1))).x);
  expect(s.x + s.width - (first.x + first.width) - 4).toBeCloseTo(16, 0);
  const legacy = bar(page, 'legacy-static');
  await legacy.evaluate((el) => {
    el.setAttribute('dir', 'rtl');
  });
  const l = await box(legacy);
  const fab = await box(legacy.locator('.m3e-fab'));
  expect(fab.x - l.x).toBeCloseTo(16, 0);
});

test.describe('states', () => {
  test('focused item', async ({ page }) => {
    const tb = bar(page, 'static-center');
    await tb.scrollIntoViewIfNeeded();
    const item = tb.locator('.m3e-icon-button').first();
    await item.focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await expect(item).toBeFocused();
    const r = await box(tb);
    await expect(page).toHaveScreenshot('docked-toolbar-item-focused.png', {
      clip: { x: r.x, y: r.y - 8, width: r.width, height: r.height + 16 },
    });
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the snap jumps (spatial spring off)', async ({ page }) => {
    const tb = bar(page, 'element-toolbar');
    const offset = await page.getByTestId('element-scroller').evaluate(async (el) => {
      el.scrollTop = 40;
      el.dispatchEvent(new Event('scroll'));
      el.dispatchEvent(new Event('scrollend'));
      await new Promise((r) => requestAnimationFrame(r));
      const root = document.querySelector<HTMLElement>('[data-testid="element-toolbar"] > div')!;
      return root.style.getPropertyValue('--_m3e-docked-toolbar-offset');
    });
    expect(offset).toBe('-64px');
    await expect(tb).toHaveAttribute('data-scroll-behavior', 'exit-always');
  });
});

test.describe('forced colors', () => {
  test.use({ forcedColors: 'active' });

  test('the bars keep a visible edge', async ({ page }) => {
    for (const id of ['static-spread', 'legacy-static']) {
      const style = await bar(page, id).evaluate((el) => getComputedStyle(el).borderTopStyle);
      expect(style, id).toBe('solid');
    }
  });
});
