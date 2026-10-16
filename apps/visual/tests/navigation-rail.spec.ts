import AxeBuilder from '@axe-core/playwright';
import { springValue, springVelocity } from '@kyralabs/m3e-motion';
import { type Locator, type Page, expect, test } from '@playwright/test';

// Navigation rail (COMPONENT_SPEC §14): wide navigation rail (collapsed / expanded / animated),
// the modal rail, the elements and React, + legacy (D4) rail. Acceptance + light/dark × 3
// browsers baselines, axe, the one-layout-per-frame check and clock-driven spring traces.
const box = async (el: Locator) => (await el.boundingBox())!;
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
const token = (page: Page, name: string) =>
  page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
const spring = async (page: Page, name: string) => ({
  dampingRatio: Number(await token(page, `--m3e-sys-motion-spring-${name}-damping-ratio`)),
  stiffness: Number(await token(page, `--m3e-sys-motion-spring-${name}-stiffness`)),
});
type RailHost = HTMLElement & { toggle(): void; expand(): void; collapse(): void };
/** The rendered `<nav>` / modal root of an element demo. */
const elementRail = (page: Page) => page.getByTestId('element-rail').locator('nav');
const modalRoot = (page: Page, id: string) =>
  page.getByTestId(id).locator('.m3e-modal-wide-navigation-rail');
/** Waits until a rail rests (its layout removed data-animating). */
const rests = (nav: Locator) =>
  expect.poll(() => nav.evaluate((el) => el.hasAttribute('data-animating'))).toBe(false);
/** Whether focus is inside `el`. */
const hasFocus = (el: Locator) => el.evaluate((node) => node.contains(document.activeElement));
const part = (item: Locator, name: string) => item.locator(`.m3e-navigation-item__${name}`);
/** The element is painted on top at its center (not covered by the indicator). */
const onTop = (el: Locator) =>
  el.evaluate((node) => {
    const r = node.getBoundingClientRect();
    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return hit !== null && (hit === node || node.contains(hit));
  });

test.beforeEach(async ({ page }) => {
  await page.goto('/components/navigation-rail/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByTestId('react-rail').locator('.m3e-navigation-item')).toHaveCount(4);
});

test('has no axe violations', async ({ page }) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();
  expect(results.violations).toEqual([]);
});

test('matches the visual baseline', async ({ page }) => {
  await expect(page).toHaveScreenshot('navigation-rail.png', { fullPage: true });
});

test('collapsed rail geometry follows WideNavigationRail', async ({ page }) => {
  const rail = page.getByTestId('rail-collapsed');
  const railBox = await box(rail);
  expect(railBox.width).toBeCloseTo(96, 1);
  const header = await box(rail.locator('.m3e-wide-navigation-rail__header'));
  expect(header.y - railBox.y).toBeCloseTo(44, 1);
  const items = await rail.locator('.m3e-navigation-item').all();
  expect((await box(items[0]!)).y - (header.y + header.height)).toBeCloseTo(40, 1);
  for (const [i, item] of items.entries()) {
    const itemBox = await box(item);
    expect(itemBox.width).toBeCloseTo(96, 1);
    expect(itemBox.height).toBeCloseTo(64, 1);
    const pill = await box(part(item, 'state'));
    expect(pill.width).toBeCloseTo(56, 1);
    expect(pill.height).toBeCloseTo(32, 1);
    expect(pill.x - itemBox.x).toBeCloseTo(20, 1);
    expect(pill.y).toBeCloseTo(itemBox.y, 1);
    expect((await box(part(item, 'label'))).y - (pill.y + pill.height)).toBeCloseTo(4, 1);
    if (i > 0) {
      const previous = await box(items[i - 1]!);
      expect(itemBox.y - (previous.y + previous.height)).toBeCloseTo(4, 1);
    }
  }
});

test('expanded rail: icons before labels, as wide as the widest item (220–360)', async ({
  page,
}) => {
  const rail = page.getByTestId('rail-expanded');
  const railBox = await box(rail);
  const items = await rail.locator('.m3e-navigation-item').all();
  let widest = 0;
  for (const [i, item] of items.entries()) {
    const itemBox = await box(item);
    widest = Math.max(widest, itemBox.width);
    const pill = await box(part(item, 'state'));
    const icon = await box(part(item, 'icon'));
    const label = await box(part(item, 'label'));
    expect(pill.x - railBox.x).toBeCloseTo(20, 1);
    expect(pill.height).toBeCloseTo(56, 1);
    expect(await onTop(part(item, 'icon'))).toBe(true);
    expect(await onTop(part(item, 'label'))).toBe(true);
    expect(icon.x - pill.x).toBeCloseTo(16, 1);
    expect(label.x - (icon.x + icon.width)).toBeCloseTo(8, 1);
    expect(pill.x + pill.width).toBeCloseTo(itemBox.x + itemBox.width, 0);
    if (i > 0) expect(itemBox.y).toBeCloseTo((await box(items[i - 1]!)).y + 56, 0);
  }
  expect(railBox.width).toBeCloseTo(Math.min(360, Math.max(220, widest + 20)), 0);
});

test('React rail: selection moves aria-current; the menu button expands it', async ({ page }) => {
  const rail = page.getByTestId('react-rail');
  const items = rail.locator('.m3e-navigation-item');
  await items.nth(1).click();
  await expect(rail.locator('[aria-current]')).toHaveCount(1);
  await expect(items.nth(1)).toHaveAttribute('aria-current', 'page');
  await expect
    .poll(() => box(part(items.nth(1), 'indicator')).then((b) => b.width))
    .toBeCloseTo(56, 1);
  await rail.getByRole('button', { name: 'Expand' }).click();
  await expect(rail).toHaveClass(/m3e-wide-navigation-rail--expanded/);
  await expect.poll(() => box(rail).then((b) => b.width)).toBeGreaterThanOrEqual(220);
});

test('legacy rail geometry follows NavigationRail (D4)', async ({ page }) => {
  await expect(page.locator('[data-deprecated] .docs-deprecated')).toBeVisible();
  const rail = page.getByTestId('legacy-rail');
  const railBox = await box(rail);
  expect(railBox.width).toBeCloseTo(80, 1);
  const items = await rail.locator('.m3e-navigation-item').all();
  const first = await box(items[0]!);
  expect(first.y - railBox.y).toBeCloseTo(4, 1);
  expect(first.height).toBeCloseTo(56, 1);
  expect((await box(items[1]!)).y - (first.y + first.height)).toBeCloseTo(4, 1);
  expect((await box(part(items[0]!, 'state'))).y).toBeCloseTo(first.y, 1);
  const iconOnly = page.getByTestId('legacy-rail-icons').locator('.m3e-navigation-item').first();
  const circle = await box(part(iconOnly, 'state'));
  expect(circle.width).toBeCloseTo(56, 1);
  expect(circle.height).toBeCloseTo(56, 1);
});

test('focus ring on the indicator pill', async ({ page }) => {
  const item = page.getByTestId('c-search');
  await page.getByTestId('c-home').focus();
  await page.keyboard.press('Tab');
  await expect(item).toBeFocused();
  expect(await part(item, 'state').evaluate((el) => getComputedStyle(el).outlineStyle)).toBe(
    'solid',
  );
  const frame = await box(page.getByTestId('rail-collapsed'));
  await expect(page).toHaveScreenshot('navigation-rail-focused.png', { clip: frame });
});

test.describe('forced colors', () => {
  test.use({ forcedColors: 'active' });

  test('rails keep a boundary', async ({ page }) => {
    for (const id of ['rail-collapsed', 'legacy-rail']) {
      expect(
        await page.getByTestId(id).evaluate((el) => getComputedStyle(el).borderInlineEndStyle),
        id,
      ).toBe('solid');
    }
  });

  test('the open modal rail keeps its boundary over a visible scrim', async ({ page }) => {
    await page.getByTestId('element-modal-rail').evaluate((host) => {
      (host as RailHost).expand();
    });
    const root = modalRoot(page, 'element-modal-rail');
    await expect(root).toHaveAttribute('data-open', '');
    await rests(root.locator('nav'));
    expect(
      await root.locator('nav').evaluate((el) => getComputedStyle(el).borderInlineEndStyle),
    ).toBe('solid');
    const scrim = root.locator('.m3e-modal-wide-navigation-rail__scrim');
    expect(await scrim.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(
      'rgba(0, 0, 0, 0)',
    );
  });
});

test('only one item per rail has aria-current; presses move it (element and React)', async ({
  page,
}) => {
  for (const nav of await page.locator('nav[class*="navigation-rail"]').all()) {
    await expect(nav.locator('[aria-current]')).toHaveCount(1);
  }
  const rail = elementRail(page);
  await rail.locator('.m3e-navigation-item').nth(2).click();
  await expect(rail.locator('[aria-current]')).toHaveCount(1);
  await expect(rail.locator('.m3e-navigation-item').nth(2)).toHaveAttribute('aria-current', 'page');
  await expect(page.getByTestId('element-rail')).toHaveAttribute('selected', 'favorite');
});

test('48dp targets: every item of every rail state', async ({ page }) => {
  for (const id of ['rail-collapsed', 'rail-expanded', 'legacy-rail']) {
    for (const item of await page.getByTestId(id).locator('.m3e-navigation-item').all()) {
      const b = await box(item);
      expect(b.width, id).toBeGreaterThanOrEqual(48);
      expect(b.height, id).toBeGreaterThanOrEqual(48);
    }
  }
});

test('RTL: the pill, icon and label mirror', async ({ page }) => {
  for (const id of ['rail-collapsed', 'rail-expanded']) {
    await page.getByTestId(id).evaluate((el) => {
      el.setAttribute('dir', 'rtl');
    });
  }
  const collapsed = page.getByTestId('rail-collapsed');
  const railBox = await box(collapsed);
  const item = collapsed.locator('.m3e-navigation-item').first();
  const pill = await box(part(item, 'state'));
  expect(railBox.x + railBox.width - (pill.x + pill.width)).toBeCloseTo(20, 1);
  const label = await box(part(item, 'label'));
  expect(label.x + label.width / 2).toBeCloseTo(pill.x + pill.width / 2, 0);
  const expanded = page.getByTestId('rail-expanded');
  const wide = await box(expanded);
  const first = expanded.locator('.m3e-navigation-item').first();
  const widePill = await box(part(first, 'state'));
  const icon = await box(part(first, 'icon'));
  const wideLabel = await box(part(first, 'label'));
  expect(wide.x + wide.width - (widePill.x + widePill.width)).toBeCloseTo(20, 1);
  expect(widePill.x + widePill.width - (icon.x + icon.width)).toBeCloseTo(16, 1);
  expect(icon.x - (wideLabel.x + wideLabel.width)).toBeCloseTo(8, 1);
});

test('element rail: header slot; toggle() animates to the expanded geometry', async ({ page }) => {
  const host = page.getByTestId('element-rail');
  const rail = elementRail(page);
  await expect(rail.locator('.m3e-wide-navigation-rail__header [data-rail-toggle]')).toHaveCount(1);
  expect((await box(rail)).width).toBeCloseTo(96, 1);
  await rail.locator('[data-rail-toggle]').click();
  await expect(host).toHaveAttribute('expanded', '');
  await expect(rail).toHaveClass(/m3e-wide-navigation-rail--expanded/);
  await rests(rail);
  // At rest the classes alone describe the rail: the static expanded geometry.
  expect(await rail.evaluate((el) => el.getAttribute('style'))).toBeNull();
  expect((await box(rail)).width).toBeCloseTo(220, 0);
  const item = rail.locator('.m3e-navigation-item').first();
  expect((await box(part(item, 'state'))).height).toBeCloseTo(56, 1);
  await rail.locator('[data-rail-toggle]').click();
  await rests(rail);
  expect((await box(rail)).width).toBeCloseTo(96, 1);
});

test('expanding lays the rail out at most once per frame and reads no layout', async ({
  page,
  browserName,
}) => {
  await elementRail(page).scrollIntoViewIfNeeded();
  // Every layout read during the animation would force a synchronous reflow: count them.
  await page.evaluate(() => {
    const w = window as unknown as { layoutReads: number };
    w.layoutReads = 0;
    const count = (proto: object, name: string) => {
      const d = Object.getOwnPropertyDescriptor(proto, name)!;
      Object.defineProperty(proto, name, {
        ...d,
        get(this: unknown) {
          w.layoutReads++;
          return (d.get as (this: unknown) => unknown).call(this);
        },
      });
    };
    for (const name of ['offsetWidth', 'offsetHeight', 'offsetLeft', 'offsetTop']) {
      count(HTMLElement.prototype, name);
    }
    for (const name of ['clientWidth', 'clientHeight', 'scrollWidth', 'scrollHeight']) {
      count(Element.prototype, name);
    }
    for (const name of ['getBoundingClientRect', 'getClientRects'] as const) {
      const original = Object.getOwnPropertyDescriptor(Element.prototype, name)!.value as (
        this: Element,
      ) => unknown;
      Object.defineProperty(Element.prototype, name, {
        configurable: true,
        value(this: Element) {
          w.layoutReads++;
          return original.call(this);
        },
      });
    }
  });
  const cdp = browserName === 'chromium' ? await page.context().newCDPSession(page) : null;
  await cdp?.send('Performance.enable');
  const layouts = async () =>
    cdp
      ? ((await cdp.send('Performance.getMetrics')).metrics.find((m) => m.name === 'LayoutCount')
          ?.value ?? 0)
      : 0;
  const before = await layouts();
  const { frames, reads, widths } = await page.evaluate(async () => {
    const host = document.querySelector<RailHost>('[data-testid="element-rail"]')!;
    const nav = host.querySelector('nav')!;
    const w = window as unknown as { layoutReads: number };
    const next = () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          resolve();
        });
      });
    w.layoutReads = 0;
    host.toggle();
    const sizes: string[] = [];
    let count = 0;
    do {
      await next();
      count++;
      sizes.push(nav.style.getPropertyValue('--_m3e-wnr-inline-size'));
    } while (nav.hasAttribute('data-animating') && count < 600);
    return { frames: count, reads: w.layoutReads, widths: sizes };
  });
  const after = await layouts();
  const evidence = `${String(frames)} frames, ${cdp ? String(after - before) : 'n/a'} layouts, ${String(reads)} layout reads`;
  test.info().annotations.push({ type: 'layout', description: evidence });
  console.log(`[${browserName}] ${evidence}`);
  expect(frames).toBeGreaterThan(10);
  // The width moved through many frames (not a jump), with zero layout reads by the rail.
  expect(new Set(widths).size).toBeGreaterThan(8);
  expect(reads).toBe(0);
  // Chromium's layout counter: at most one layout per rendered frame (+1 for the toggle frame).
  if (cdp) expect(after - before).toBeLessThanOrEqual(frames + 1);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('spatial springs jump: the rail expands in one frame', async ({ page }) => {
    const rail = elementRail(page);
    const frames = await page.getByTestId('element-rail').evaluate(async (host) => {
      const nav = host.querySelector('nav')!;
      (host as RailHost).toggle();
      await new Promise((resolve) => setTimeout(resolve, 0));
      let count = 0;
      while (nav.hasAttribute('data-animating') && count < 100) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
        count++;
      }
      return count;
    });
    expect(frames).toBe(0);
    expect((await box(rail)).width).toBeCloseTo(220, 0);
  });
});

test('modal rail: dialog semantics, focus trapped, Escape closes, focus returns to the opener', async ({
  page,
}) => {
  const host = page.getByTestId('element-modal-rail');
  const root = modalRoot(page, 'element-modal-rail');
  const menu = host.locator('[data-rail-toggle]');
  await expect(root).not.toHaveAttribute('role', 'dialog');
  await menu.focus();
  await page.keyboard.press('Enter');
  await expect(root).toHaveAttribute('data-open', '');
  await expect(root).toHaveAttribute('role', 'dialog');
  await expect(root).toHaveAttribute('aria-modal', 'true');
  await expect(root).toHaveAttribute('aria-label', 'Navigation rail');
  await expect(menu).toBeFocused();
  const nav = root.locator('nav');
  await rests(nav);
  // The window rail: at the window's start edge, full height, 220dp, large corners.
  const railBox = await box(nav);
  expect(railBox.x).toBeCloseTo(0, 1);
  expect(railBox.y).toBeCloseTo(0, 1);
  expect(railBox.height).toBeCloseTo(page.viewportSize()!.height, 0);
  expect(railBox.width).toBeCloseTo(220, 0);
  expect(await nav.evaluate((el) => getComputedStyle(el).borderTopLeftRadius)).toBe(
    await token(page, '--m3e-sys-shape-corner-large'),
  );
  // Tab and Shift+Tab stay inside the rail.
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab');
    expect(await hasFocus(nav)).toBe(true);
  }
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Shift+Tab');
    expect(await hasFocus(nav)).toBe(true);
  }
  await page.keyboard.press('Tab');
  await page.keyboard.press('Escape');
  await expect(host).not.toHaveAttribute('expanded', '');
  await expect(menu).toBeFocused();
  await expect(root).not.toHaveAttribute('data-open', '');
  await expect(root).not.toHaveAttribute('role', 'dialog');
  expect((await box(nav)).width).toBeCloseTo(96, 1);
});

test('modal rail: the scrim closes it; the page does not scroll while open', async ({ page }) => {
  const host = page.getByTestId('element-modal-rail');
  const root = modalRoot(page, 'element-modal-rail');
  await host.locator('[data-rail-toggle]').click();
  await expect(root).toHaveAttribute('data-open', '');
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('hidden');
  const scrim = root.locator('.m3e-modal-wide-navigation-rail__scrim');
  await expect
    .poll(() => scrim.evaluate((el) => Number(getComputedStyle(el).opacity)))
    .toBeCloseTo(
      Number(await token(page, '--m3e-comp-modal-wide-navigation-rail-scrim-opacity')),
      2,
    );
  const viewport = page.viewportSize()!;
  await page.mouse.click(viewport.width - 20, viewport.height / 2);
  await expect(root).not.toHaveAttribute('data-open', '');
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('');
});

test('dismissible modal rail: slides in, focus moves in and returns to the opener', async ({
  page,
}) => {
  const root = modalRoot(page, 'element-dismissible-rail');
  const open = page.getByTestId('open-dismissible');
  const nav = root.locator('nav');
  await expect(nav).toBeHidden();
  expect((await box(root)).width).toBe(0);
  await open.focus();
  await page.keyboard.press('Enter');
  await expect(root).toHaveAttribute('data-open', '');
  // Focus goes to the current destination.
  await expect(nav.locator('[aria-current]')).toBeFocused();
  await rests(nav);
  await expect
    .poll(() => root.evaluate((el) => el.style.getPropertyValue('--_m3e-wnr-slide')))
    .toBe('');
  expect((await box(nav)).x).toBeCloseTo(0, 1);
  await page.keyboard.press('Escape');
  await expect(open).toBeFocused();
  await expect(root).not.toHaveAttribute('data-open', '');
  await expect(nav).toBeHidden();
});

test('React modal rail: isExpanded + onExpandedChange; Escape closes it', async ({ page }) => {
  const root = page.getByTestId('react-modal-rail');
  const menu = root.getByRole('button', { name: 'Expand' });
  await menu.focus();
  await page.keyboard.press('Enter');
  await expect(root).toHaveAttribute('role', 'dialog');
  await expect(root.locator('nav')).toHaveAttribute('aria-label', 'React modal example');
  await page.keyboard.press('Escape');
  await expect(root).not.toHaveAttribute('data-open', '');
  await expect(root.getByRole('button', { name: 'Expand' })).toBeFocused();
});

test('has no axe violations with the modal rail open', async ({ page }) => {
  await page.getByTestId('element-modal-rail').evaluate((host) => {
    (host as RailHost).expand();
  });
  await rests(modalRoot(page, 'element-modal-rail').locator('nav'));
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  expect(results.violations).toEqual([]);
});

test('matches the visual baseline with the modal rail open', async ({ page }) => {
  await page.getByTestId('element-modal-rail').evaluate((host) => {
    (host as RailHost).expand();
  });
  const root = modalRoot(page, 'element-modal-rail');
  await rests(root.locator('nav'));
  await expect
    .poll(() => root.evaluate((el) => el.style.getPropertyValue('--_m3e-wnr-scrim')))
    .toBe('');
  await expect(page).toHaveScreenshot('navigation-rail-modal-open.png');
});

test.describe('springs (frames driven by the Playwright clock)', () => {
  // Fake timers make the trace deterministic: every requestAnimationFrame and performance.now()
  // the rail's layout sees comes from page.clock.
  test.beforeEach(async ({ page }) => {
    await page.clock.install();
    await page.reload();
    await expect(elementRail(page)).toBeVisible();
    await elementRail(page).scrollIntoViewIfNeeded();
  });

  interface Frame {
    progress: number;
    width: number;
  }

  /** When (whole ms after the start, 0–20) a 0 → 1 spring shows `value`. */
  const firstFrame = (spec: { dampingRatio: number; stiffness: number }, value: number) => {
    let best = 0;
    for (let t = 1; t <= 20; t++) {
      if (
        Math.abs(springValue(spec, t, 0, 1) - value) <
        Math.abs(springValue(spec, best, 0, 1) - value)
      )
        best = t;
    }
    return best;
  };

  /** Toggles the element rail, recording progress and width each 16ms frame; again at `reverseAt`. */
  async function trace(page: Page, frames: number, reverseAt = -1): Promise<Frame[]> {
    await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 10_000);
    await page.evaluate(
      ([n, reverse]) => {
        const host = document.querySelector<RailHost>('[data-testid="element-rail"]')!;
        const nav = host.querySelector('nav')!;
        const out: Frame[] = [];
        (window as unknown as { railTrace: Frame[] }).railTrace = out;
        const frame = () => {
          out.push({
            progress: Number.parseFloat(nav.style.getPropertyValue('--_m3e-wnr-progress')),
            width: Number.parseFloat(nav.style.getPropertyValue('--_m3e-wnr-inline-size')),
          });
          if (out.length === reverse) host.toggle();
          if (out.length < n) requestAnimationFrame(frame);
        };
        host.toggle();
        // After the element's render microtask: its layout's frame callback runs first.
        queueMicrotask(() => {
          requestAnimationFrame(frame);
        });
      },
      [frames, reverseAt] as const,
    );
    await page.clock.runFor(16 * frames + 100);
    return page.evaluate(() => (window as unknown as { railTrace: Frame[] }).railTrace);
  }

  test('expands on the default spatial spring (width: lerp(96, 220, p)), interruptible with velocity kept', async ({
    page,
  }) => {
    const spatial = await spring(page, 'default-spatial');
    const frames = await trace(page, 90);
    const t0 = firstFrame(spatial, frames[0]!.progress);
    for (let i = 0; i < 18; i++) {
      const expected = springValue(spatial, t0 + 16 * i, 0, 1);
      expect(frames[i]!.progress, `frame ${String(i)}`).toBeCloseTo(Math.max(expected, 0), 3);
      // Narrow labels: WideNavigationRailLayout keeps the rail on minWidth.
      expect(frames[i]!.width, `frame ${String(i)}`).toBeCloseTo(96 + 124 * expected, 1);
    }
    // The expressive spring overshoots the expanded minimum, then rests on the class.
    expect(Math.max(...frames.map((f) => f.width).filter(Number.isFinite))).toBeGreaterThan(220);
    expect(frames.slice(40).some((f) => Number.isNaN(f.width))).toBe(true);

    // Reversed at frame 10: the collapse starts from the expand spring's value and velocity.
    await page.reload();
    await expect(elementRail(page)).toBeVisible();
    const reversed = await trace(page, 40, 10);
    const at = firstFrame(spatial, reversed[0]!.progress) + 9 * 16;
    const from = springValue(spatial, at, 0, 1);
    const velocity = springVelocity(spatial, at, 0, 1);
    for (let i = 10; i < 18; i++) {
      const expected = springValue(spatial, 16 * (i - 9), from, 0, velocity);
      expect(reversed[i]!.progress, `frame ${String(i)}`).toBeCloseTo(Math.max(expected, 0), 3);
    }
    expect(reversed[10]!.progress).toBeGreaterThan(reversed[9]!.progress - 0.02);
  });

  test('mid-animation frame (frozen on the clock) matches the visual baseline', async ({
    page,
  }) => {
    await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 10_000);
    const rail = elementRail(page);
    await page.getByTestId('element-rail').evaluate((host) => {
      (host as RailHost).toggle();
    });
    await page.clock.runFor(96);
    const frame = await box(rail);
    await expect(page).toHaveScreenshot('navigation-rail-mid-animation.png', {
      clip: { x: frame.x, y: frame.y, width: 240, height: frame.height },
    });
  });
});
