import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';

// Floating toolbar (COMPONENT_SPEC §9): acceptance criteria + light/dark × 3 browsers baselines of
// the static matrix (horizontal/vertical × expanded/collapsed × with/without FAB), axe, roving
// focus for both JS layers, both scroll behaviors, and the interruptible springs traced frame by
// frame on the Playwright clock.
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

const token = (page: Page, name: string) =>
  page.evaluate(
    (n) => Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue(n)),
    name,
  );
const box = async (el: Locator) => (await el.boundingBox())!;

/** The toolbar root of a test id (the element's rendered root, or the React root itself). */
const toolbar = (page: Page, id: string) =>
  page.locator(
    `[data-testid="${id}"].m3e-floating-toolbar, [data-testid="${id}"] > .m3e-floating-toolbar`,
  );

/** Waits until no spring runs on the toolbar (no inline progress, no data-animating). */
const settled = (tb: Locator) =>
  expect
    .poll(() =>
      tb.evaluate(
        (el) =>
          !el.hasAttribute('data-animating') &&
          (el as HTMLElement).style.getPropertyValue('--_m3e-floating-toolbar-progress') === '',
      ),
    )
    .toBe(true);

test.beforeEach(async ({ page }) => {
  await page.goto('/components/floating-toolbar/');
  await page.evaluate(() => document.fonts.ready);
  await expect(toolbar(page, 'react-fab-toolbar')).toHaveAttribute('data-spring', '');
  await expect(toolbar(page, 'element-toolbar')).toHaveAttribute('data-spring', '');
});

test('has no axe violations (expanded and collapsed)', async ({ page }) => {
  expect((await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()).violations).toEqual([]);
  await page.locator('#element-toggle').click();
  await toolbar(page, 'react-fab-toolbar').locator('.m3e-fab').click();
  await settled(toolbar(page, 'element-toolbar'));
  await settled(toolbar(page, 'react-fab-toolbar'));
  expect((await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()).violations).toEqual([]);
});

test('matches the visual baseline', async ({ page }) => {
  await expect(page).toHaveScreenshot('floating-toolbar.png', { fullPage: true });
});

test('collapsed by both JS layers, settled, matches the static CSS states', async ({ page }) => {
  await page.locator('#element-toggle').click();
  const element = toolbar(page, 'element-toolbar');
  await settled(element);
  await toolbar(page, 'react-fab-toolbar').locator('.m3e-fab').click();
  const react = toolbar(page, 'react-fab-toolbar');
  await settled(react);
  await page.mouse.move(0, 0);
  // At rest no spring style is left.
  for (const tb of [element, react]) {
    expect(
      await tb.evaluate((el) =>
        [el, ...el.querySelectorAll('*')]
          .map((n) => (n as HTMLElement).style)
          .flatMap((s) => [
            s.getPropertyValue('--_m3e-floating-toolbar-progress'),
            s.getPropertyValue('inline-size'),
            s.getPropertyValue('block-size'),
          ])
          .filter(Boolean),
      ),
    ).toEqual([]);
  }
  // Same geometry as the static collapsed toolbars.
  expect((await box(element)).width).toBeCloseTo(
    (await box(page.getByTestId('static-horizontal-collapsed'))).width,
    0,
  );
  expect((await box(react)).width).toBeCloseTo(
    (await box(page.getByTestId('static-fab-collapsed'))).width,
    0,
  );
  await expect(page).toHaveScreenshot('floating-toolbar-element-collapsed.png', {
    clip: await box(element),
  });
  await react.scrollIntoViewIfNeeded();
  const r = await box(react);
  await expect(page).toHaveScreenshot('floating-toolbar-react-fab-collapsed.png', {
    clip: { x: r.x - 8, y: r.y - 8, width: r.width + 16, height: r.height + 16 },
  });
});

test('measurements match the generated tokens (64dp, 8dp padding, 48dp slots, FAB 56 → 80dp)', async ({
  page,
}) => {
  const size = await token(page, '--m3e-comp-floating-toolbar-defaults-container-size');
  const padding = await token(page, '--m3e-comp-floating-toolbar-defaults-content-padding-start');
  const slot = await token(page, '--m3e-comp-minimum-interactive-component-size');
  expect([size, padding, slot]).toEqual([64, 8, 48]);

  const horizontal = page.getByTestId('static-horizontal');
  const h = await box(horizontal);
  expect(h.height).toBeCloseTo(size, 0);
  const buttons = horizontal.locator('.m3e-icon-button');
  await expect(buttons).toHaveCount(5);
  expect(h.width).toBeCloseTo(5 * slot + 2 * padding, 0);
  // Items edge to edge in 48dp slots: 40dp buttons 48dp apart, the first one 8 + 4dp in.
  const b0 = await box(buttons.nth(0));
  const b1 = await box(buttons.nth(1));
  expect(b1.x - b0.x).toBeCloseTo(slot, 0);
  expect(b0.x - h.x).toBeCloseTo(padding + (slot - b0.width) / 2, 0);
  expect(b0.y - h.y).toBeCloseTo((size - b0.height) / 2, 0);
  // Corner full.
  expect(
    await horizontal
      .locator('.m3e-floating-toolbar__bar')
      .evaluate((el) => Number.parseFloat(getComputedStyle(el).borderTopLeftRadius)),
  ).toBeGreaterThanOrEqual(size / 2);

  const vertical = await box(page.getByTestId('static-vertical'));
  expect(vertical.width).toBeCloseTo(size, 0);
  expect(vertical.height).toBeCloseTo(5 * slot + 2 * padding, 0);

  // Collapsed: leading and trailing are gone.
  expect((await box(page.getByTestId('static-horizontal-collapsed'))).width).toBeCloseTo(
    3 * slot + 2 * padding,
    0,
  );

  // With a FAB: an 80dp tall row of toolbar + 8dp + 56dp; expanded FAB 56dp, collapsed 80dp.
  const gap = await token(page, '--m3e-comp-floating-toolbar-defaults-toolbar-to-fab-gap');
  const fabMin = await token(page, '--m3e-comp-fab-baseline-container-width');
  const fabMax = await token(page, '--m3e-comp-fab-medium-container-width');
  expect([gap, fabMin, fabMax]).toEqual([8, 56, 80]);
  const fab = page.getByTestId('static-fab');
  const f = await box(fab);
  const bar = await box(fab.locator('.m3e-floating-toolbar__bar'));
  const fabBox = await box(fab.locator('.m3e-fab'));
  expect(f.height).toBeCloseTo(fabMax, 0);
  expect(f.width).toBeCloseTo(bar.width + gap + fabMin, 0);
  expect(bar.height).toBeCloseTo(size, 0);
  expect(fabBox.width).toBeCloseTo(fabMin, 0);
  expect(fabBox.x + fabBox.width).toBeCloseTo(f.x + f.width, 0);
  expect(fabBox.x - (bar.x + bar.width)).toBeCloseTo(gap, 0);
  expect(
    await fab
      .locator('.m3e-fab')
      .evaluate((el) => Number.parseFloat(getComputedStyle(el).borderTopLeftRadius)),
  ).toBeCloseTo(await token(page, '--m3e-sys-shape-corner-large'), 0);
  const collapsed = page.getByTestId('static-fab-collapsed');
  const c = await box(collapsed);
  const cFab = await box(collapsed.locator('.m3e-fab'));
  expect(c.width).toBeCloseTo(f.width, 0);
  expect(cFab.width).toBeCloseTo(fabMax, 0);
  expect(cFab.x + cFab.width).toBeCloseTo(c.x + c.width, 0);
  await expect(collapsed.locator('.m3e-floating-toolbar__bar')).toBeHidden();

  const v = await box(page.getByTestId('static-vertical-fab'));
  expect(v.width).toBeCloseTo(fabMax, 0);
  const vc = await box(page.getByTestId('static-vertical-fab-collapsed').locator('.m3e-fab'));
  expect(vc.height).toBeCloseTo(fabMax, 0);
});

for (const [layer, id] of [
  ['element', 'element-toolbar'],
  ['react', 'react-vertical-toolbar'],
] as const) {
  test(`${layer}: role="toolbar", one tab stop, arrows (no wrap), Home/End`, async ({ page }) => {
    const tb = toolbar(page, id);
    const vertical = layer === 'react';
    await expect(tb).toHaveAttribute('role', 'toolbar');
    await expect(tb).toHaveAttribute('aria-orientation', vertical ? 'vertical' : 'horizontal');
    const items = tb.locator('button');
    const count = await items.count();
    await expect(tb.locator('button[tabindex="0"]')).toHaveCount(1);
    await items.first().focus();
    const next = vertical ? 'ArrowDown' : 'ArrowRight';
    const prev = vertical ? 'ArrowUp' : 'ArrowLeft';
    await page.keyboard.press(next);
    await expect(items.nth(1)).toBeFocused();
    await expect(items.nth(1)).toHaveAttribute('tabindex', '0');
    await page.keyboard.press('End');
    await expect(items.nth(count - 1)).toBeFocused();
    await page.keyboard.press(next);
    await expect(items.nth(count - 1)).toBeFocused();
    await page.keyboard.press('Home');
    await expect(items.first()).toBeFocused();
    await page.keyboard.press(prev);
    await expect(items.first()).toBeFocused();
    // Tab leaves the toolbar; Shift+Tab comes back to the last focused item.
    await page.keyboard.press(next);
    await page.keyboard.press('Tab');
    expect(await tb.evaluate((el) => el.contains(document.activeElement))).toBe(false);
    await page.keyboard.press('Shift+Tab');
    await expect(items.nth(1)).toBeFocused();
  });
}

test('element: collapsing hides and inerts the leading/trailing items, expanding brings them back', async ({
  page,
}) => {
  const tb = toolbar(page, 'element-toolbar');
  const leading = tb.locator('.m3e-floating-toolbar__leading');
  await expect(leading).toBeVisible();
  await page.locator('#element-toggle').click();
  await expect(leading).toHaveJSProperty('inert', true);
  await settled(tb);
  await expect(leading).toBeHidden();
  await page.locator('#element-toggle').click();
  await expect(leading).toHaveJSProperty('inert', false);
  await settled(tb);
  await expect(leading).toBeVisible();
});

test('react: the FAB folds the toolbar into itself and focus stays on the FAB', async ({
  page,
}) => {
  const tb = toolbar(page, 'react-fab-toolbar');
  const fab = tb.locator('.m3e-fab');
  await fab.focus();
  await page.keyboard.press('Enter');
  await expect(tb).toHaveClass(/m3e-floating-toolbar--collapsed/);
  await expect(tb.locator('.m3e-floating-toolbar__bar')).toHaveJSProperty('inert', true);
  await settled(tb);
  await expect(fab).toBeFocused();
  expect((await box(fab)).width).toBeCloseTo(80, 0);
  await expect(tb.locator('.m3e-floating-toolbar__bar')).toBeHidden();
  await page.keyboard.press('Enter');
  await settled(tb);
  expect((await box(fab)).width).toBeCloseTo(56, 0);
});

test('exitAlways: hides on scroll down, shows on scroll up, out of the tab order while away', async ({
  page,
}) => {
  const tb = toolbar(page, 'react-exit-toolbar');
  const scroller = page.getByTestId('exit-scroller');
  await scroller.scrollIntoViewIfNeeded();
  await expect(tb).toHaveAttribute('data-exit-direction', 'bottom');
  const frame = await box(scroller);
  const offset = () =>
    tb.evaluate((el) =>
      Number.parseFloat(
        (el as HTMLElement).style.getPropertyValue('--_m3e-floating-toolbar-offset') || '0',
      ),
    );
  // Scroll down past the toolbar's distance to the frame edge: fully hidden below the frame.
  await scroller.evaluate((el) => {
    el.scrollTo({ top: 200 });
  });
  await expect.poll(offset).toBeLessThan(-70);
  await expect
    .poll(async () => (await box(tb)).y)
    .toBeGreaterThanOrEqual(frame.y + frame.height - 1);
  await expect(tb.locator('button[tabindex="0"]')).toHaveCount(0);
  // Scroll back up: shown again, back in the tab order.
  await scroller.evaluate((el) => {
    el.scrollTo({ top: 0 });
  });
  await expect.poll(offset).toBe(0);
  await expect(tb.locator('button[tabindex="0"]')).toHaveCount(1);
  // A partial scroll snaps when scrolling ends (shown below half).
  await scroller.evaluate((el) => {
    el.scrollTo({ top: 10 });
  });
  await expect.poll(offset).toBe(0);
});

test('collapse scroll behavior: collapses after 40dp down, expands after 40dp up', async ({
  page,
}) => {
  const tb = toolbar(page, 'react-collapse-toolbar');
  const scroller = page.getByTestId('collapse-scroller');
  await scroller.scrollIntoViewIfNeeded();
  await scroller.evaluate((el) => {
    el.scrollTo({ top: 30 });
  });
  await expect(tb).not.toHaveClass(/--collapsed/);
  await scroller.evaluate((el) => {
    el.scrollTo({ top: 60 });
  });
  await expect(tb).toHaveClass(/m3e-floating-toolbar--collapsed/);
  await scroller.evaluate((el) => {
    el.scrollTo({ top: 0 });
  });
  await expect(tb).not.toHaveClass(/--collapsed/);
});

test.describe('springs (frames driven by the Playwright clock)', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install();
    await page.reload();
    await expect(toolbar(page, 'react-fab-toolbar')).toHaveAttribute('data-spring', '');
    await expect(toolbar(page, 'element-toolbar')).toHaveAttribute('data-spring', '');
  });

  interface Frame {
    progress: number;
    fab: number;
    slot: number;
  }

  /**
   * Clicks `trigger`, then records the toolbar progress, the FAB width and the leading part's
   * width once per 16ms frame, clicking again after `reverseAt` frames.
   */
  async function trace(page: Page, id: string, trigger: string, frames: number, reverseAt = -1) {
    await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 10_000);
    await page.evaluate(
      ([testId, sel, n, reverse]) => {
        const host = document.querySelector(`[data-testid="${testId}"]`)!;
        const tb = (
          host.matches('.m3e-floating-toolbar') ? host : host.querySelector('.m3e-floating-toolbar')
        ) as HTMLElement;
        const button = document.querySelector<HTMLElement>(sel)!;
        const out: Frame[] = [];
        (window as unknown as { toolbarTrace: Frame[] }).toolbarTrace = out;
        const frame = () => {
          out.push({
            progress: Number.parseFloat(
              getComputedStyle(tb).getPropertyValue('--_m3e-floating-toolbar-progress'),
            ),
            fab: tb.querySelector('.m3e-fab')?.getBoundingClientRect().width ?? 0,
            slot:
              tb.querySelector('.m3e-floating-toolbar__leading')?.getBoundingClientRect().width ??
              0,
          });
          if (out.length === reverse) button.click();
          if (out.length < n) requestAnimationFrame(frame);
        };
        button.click();
        queueMicrotask(() => {
          queueMicrotask(() => requestAnimationFrame(frame));
        });
      },
      [id, trigger, frames, reverseAt] as const,
    );
    await page.clock.runFor(16 * frames + 100);
    return page.evaluate(() => (window as unknown as { toolbarTrace: Frame[] }).toolbarTrace);
  }

  test('React: collapsing grows the FAB 56 → 80dp on fast spatial (overshoot), many frames', async ({
    page,
  }) => {
    await toolbar(page, 'react-fab-toolbar').scrollIntoViewIfNeeded();
    const frames = await trace(
      page,
      'react-fab-toolbar',
      '[data-testid="react-fab-toolbar"] .m3e-fab',
      50,
    );
    const widths = frames.map((f) => f.fab);
    expect(new Set(widths.slice(0, 15).map(Math.round)).size).toBeGreaterThanOrEqual(5);
    expect(widths[0]!).toBeGreaterThan(56);
    expect(widths[0]!).toBeLessThan(80);
    // Expressive fast spatial (ζ 0.6) overshoots past 80dp, then rests on it.
    expect(Math.max(...widths)).toBeGreaterThan(80.5);
    expect(widths.at(-1)!).toBeCloseTo(80, 0);
    expect(Math.min(...frames.map((f) => f.progress).filter(Number.isFinite))).toBeLessThan(0);
  });

  for (const [layer, id, trigger] of [
    ['React', 'react-fab-toolbar', '[data-testid="react-fab-toolbar"] .m3e-fab'],
    ['element', 'element-toolbar', '#element-toggle'],
  ] as const) {
    test(`${layer}: reversing mid-flight keeps the velocity (trace)`, async ({ page }) => {
      await toolbar(page, id).scrollIntoViewIfNeeded();
      const frames = await trace(page, id, trigger, 50, 4);
      const p = frames.map((f) => f.progress);
      const last = p[3]!;
      expect(last, 'reversed mid-flight').toBeGreaterThan(0.1);
      expect(last).toBeLessThan(0.95);
      // Velocity kept: the frame after the reversal still moves toward collapsed.
      expect(p[4]!, 'continues in the old direction').toBeLessThan(last);
      for (let i = 1; i < p.length; i++) {
        if (Number.isFinite(p[i]) && Number.isFinite(p[i - 1]))
          expect(Math.abs(p[i]! - p[i - 1]!), `frame ${String(i)}`).toBeLessThan(0.35);
      }
      await settled(toolbar(page, id));
      if (layer === 'element') {
        // The leading part sprang its width down and back up without a jump.
        const slots = frames.map((f) => f.slot);
        for (let i = 1; i < slots.length; i++)
          expect(Math.abs(slots[i]! - slots[i - 1]!)).toBeLessThan(20);
      }
    });
  }
});

test('touch targets: every item sits in a ≥ 48dp slot', async ({ page }) => {
  for (const id of ['static-horizontal', 'static-vertical']) {
    const buttons = page.getByTestId(id).locator('.m3e-icon-button');
    const vertical = id.includes('vertical');
    const a = await box(buttons.nth(1));
    const b = await box(buttons.nth(2));
    expect(vertical ? b.y - a.y : b.x - a.x, id).toBeGreaterThanOrEqual(48);
  }
});

test('RTL: the FAB sits at the inline end (left) and the items mirror', async ({ page }) => {
  const tb = page.getByTestId('static-fab');
  await tb.evaluate((el) => {
    el.setAttribute('dir', 'rtl');
  });
  const r = await box(tb);
  const fab = await box(tb.locator('.m3e-fab'));
  expect(fab.x).toBeCloseTo(r.x, 0);
  const buttons = tb.locator('.m3e-icon-button');
  expect((await box(buttons.nth(0))).x).toBeGreaterThan((await box(buttons.nth(1))).x);
});

test.describe('states', () => {
  test('focused item and hovered FAB', async ({ page }) => {
    const tb = page.getByTestId('static-fab');
    await tb.scrollIntoViewIfNeeded();
    const frame = await box(tb);
    const clip = {
      x: frame.x - 8,
      y: frame.y - 8,
      width: frame.width + 16,
      height: frame.height + 16,
    };
    await tb.locator('.m3e-fab').hover();
    await expect(page).toHaveScreenshot('floating-toolbar-fab-hovered.png', { clip });
    await page.mouse.move(0, 0);
    const item = tb.locator('.m3e-icon-button').first();
    await item.focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await expect(item).toBeFocused();
    await expect(page).toHaveScreenshot('floating-toolbar-item-focused.png', { clip });
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('expand/collapse jumps (spatial spring off)', async ({ page }) => {
    const tb = toolbar(page, 'react-fab-toolbar');
    await tb.scrollIntoViewIfNeeded();
    const width = await tb.evaluate(async (el) => {
      el.querySelector<HTMLElement>('.m3e-fab')!.click();
      await new Promise((r) => requestAnimationFrame(r));
      await new Promise((r) => requestAnimationFrame(r));
      return el.querySelector('.m3e-fab')!.getBoundingClientRect().width;
    });
    expect(width).toBeCloseTo(80, 0);
  });
});

test.describe('forced colors', () => {
  test.use({ forcedColors: 'active' });

  test('the toolbar keeps a visible boundary', async ({ page }) => {
    const style = await page
      .getByTestId('static-horizontal')
      .locator('.m3e-floating-toolbar__bar')
      .evaluate((el) => getComputedStyle(el).borderTopStyle);
    expect(style).toBe('solid');
    const pill = await page
      .getByTestId('static-fab')
      .evaluate((el) => getComputedStyle(el, '::after').borderTopStyle);
    expect(pill).toBe('solid');
  });
});
