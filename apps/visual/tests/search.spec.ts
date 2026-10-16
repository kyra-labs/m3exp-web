import AxeBuilder from '@axe-core/playwright';
import { springValue, springVelocity } from '@kyralabs/m3e-motion';
import { type Locator, type Page, expect, test } from '@playwright/test';

// Search (COMPONENT_SPEC §12): collapsed bars, the four expanded views, AppBarWithSearch.
// Acceptance + light/dark × 3 browsers baselines (collapsed page, each expanded view with
// results, the scrolled app bar), axe collapsed and expanded, keyboard / combobox model, light
// dismiss, focus trap, and the expand / collapse springs traced on the Playwright clock.
const box = (el: Locator) =>
  el.evaluate((node) => {
    const { left, right, top, bottom, width, height } = node.getBoundingClientRect();
    return { left, right, top, bottom, width, height };
  });
const token = (page: Page, name: string) =>
  page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
const px = async (page: Page, name: string) => Number.parseFloat(await token(page, name));
/** A color token resolved to rgb(), for comparing with computed backgrounds. */
const color = (page: Page, name: string) =>
  page.evaluate((n) => {
    const probe = document.createElement('div');
    probe.style.color = `var(${n})`;
    document.body.append(probe);
    const value = getComputedStyle(probe).color;
    probe.remove();
    return value;
  }, name);
const background = (el: Locator) => el.evaluate((node) => getComputedStyle(node).backgroundColor);
const scrollTo = (scroller: Locator, top: number) =>
  scroller.evaluate((el, t) => {
    el.scrollTo({ top: t, behavior: 'instant' });
  }, top);

/** The `.m3e-search` root of a `<m3e-search data-testid>` demo. */
const search = (page: Page, id: string) => page.getByTestId(id).locator('.m3e-search');
const parts = (root: Locator) => ({
  view: root.locator('.m3e-search__view'),
  field: root.locator('.m3e-search__field'),
  input: root.locator('.m3e-search__input'),
  results: root.locator('.m3e-search__results'),
  options: root.locator('.m3e-search__result'),
});
/** Waits until an open view rests (springs and fades done). */
const settled = (root: Locator) =>
  expect
    .poll(
      () =>
        root.evaluate((el) =>
          [
            el.style.getPropertyValue('--_m3e-search-surface-opacity'),
            el.style.getPropertyValue('--_m3e-search-results-opacity'),
          ].join(),
        ),
      { timeout: 5000 },
    )
    .toBe('1,1');

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

test.beforeEach(async ({ page }) => {
  await page.goto('/components/search/');
  await page.evaluate(() => document.fonts.ready);
  await expect(search(page, 'docked')).toBeVisible();
  await expect(page.getByTestId('react-scroll').locator('.m3e-search')).toBeVisible();
});

test('has no axe violations (collapsed, docked expanded, full-screen expanded)', async ({
  page,
}) => {
  // Three full-page axe runs: WebKit under load can need more than the default 30s.
  test.slow();
  expect((await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()).violations).toEqual([]);
  for (const id of ['docked', 'full-screen']) {
    const root = search(page, id);
    await parts(root).input.click();
    await settled(root);
    expect((await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()).violations, id).toEqual(
      [],
    );
    await page.keyboard.press('Escape');
    await expect(root).not.toHaveAttribute('data-open');
  }
});

test('matches the visual baseline (collapsed)', async ({ page }) => {
  await expect(page).toHaveScreenshot('search.png', { fullPage: true });
});

test.describe('expanded views (reduced motion: springs jump)', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });
  for (const id of ['full-screen', 'contained', 'docked', 'docked-gap']) {
    test(`${id}: visual baseline with results`, async ({ page }) => {
      // Keyboard only, so no pointer hovers a result.
      const root = search(page, id);
      await parts(root).input.focus();
      await page.keyboard.press('ArrowDown');
      await settled(root);
      await page.keyboard.press('ArrowDown');
      await expect(parts(root).options.first()).toHaveAttribute('data-focus-visible', '');
      await expect(page).toHaveScreenshot(`search-${id}-expanded.png`);
    });
  }
});

test('collapsed bar: 56dp tall, 360dp wide, icons 16dp from the edges, text after the icon slot', async ({
  page,
}) => {
  const root = page.getByTestId('static-bar');
  const bar = await box(root);
  expect(bar.height).toBe(await px(page, '--m3e-comp-search-bar-container-height'));
  expect(bar.width).toBe(await px(page, '--m3e-comp-search-min-width'));
  expect([bar.height, bar.width]).toEqual([56, 360]);
  // Leading icon (24dp) centered in a 48dp slot moved 4dp in: 16dp from the start.
  const leading = await box(root.locator('.m3e-search__leading .m3e-icon'));
  expect(leading.left - bar.left).toBe(16);
  expect(leading.top - bar.top).toBe(16);
  // Text: 48dp slot + 4dp offset... TextField: 48 + (16 - 12) = 52dp.
  const input = await box(root.locator('.m3e-search__input'));
  const padding = await root
    .locator('.m3e-search__input')
    .evaluate((el) => Number.parseFloat(getComputedStyle(el).paddingInlineStart));
  expect(input.left + padding - bar.left).toBe(52);
  // The trailing icon button's 48dp slot ends 4dp past the edge (-4dp offset): its 40dp body
  // ends 8dp from the end.
  const mic = await box(root.getByRole('button', { name: 'Voice search' }));
  expect(bar.right - mic.right).toBe(8);
  // Pill shape.
  expect(
    await root
      .locator('.m3e-search__view')
      .evaluate((el) => Number.parseFloat(getComputedStyle(el).borderTopLeftRadius)),
  ).toBeGreaterThanOrEqual(28);
});

test('RTL: icons mirror (leading 16dp from the right)', async ({ page }) => {
  const root = page.getByTestId('static-bar');
  await root.evaluate((el) => {
    el.setAttribute('dir', 'rtl');
  });
  const bar = await box(root);
  const leading = await box(root.locator('.m3e-search__leading .m3e-icon'));
  expect(bar.right - leading.right).toBe(16);
});

test('48dp targets: the trailing button and the result rows', async ({ page }) => {
  const mic = page.getByTestId('static-bar').getByRole('button', { name: 'Voice search' });
  const target = await mic.evaluate((el) => {
    const after = getComputedStyle(el, '::after');
    return [Number.parseFloat(after.width), Number.parseFloat(after.height)];
  });
  expect(Math.min(...target)).toBeGreaterThanOrEqual(48);
  const root = search(page, 'docked');
  await parts(root).input.click();
  await settled(root);
  // Two-line rows of the samples: ListTokens two-line 72dp + the samples' 4dp above and below.
  expect((await box(parts(root).options.first())).height).toBe(80);
});

test('full-screen: the field moves 8dp under the top, the divider and results start at 72dp', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const root = search(page, 'full-screen');
  const { input, field, results, view } = parts(root);
  await input.click();
  await settled(root);
  const viewport = page.viewportSize()!;
  expect(await box(field)).toMatchObject({ left: 0, top: 8, width: viewport.width, height: 56 });
  expect((await box(results)).top).toBe(72);
  expect(await view.getAttribute('role')).toBe('dialog');
  expect(await view.getAttribute('aria-modal')).toBe('true');
  // The view is in the top layer and covers the window.
  expect(await view.evaluate((el) => el.matches(':popover-open'))).toBe(true);
  await expect(input).toBeFocused();
});

test('contained: the window surface; the field keeps its pill 8dp from the sides, 4dp down', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const root = search(page, 'contained');
  const { input, field } = parts(root);
  await input.click();
  await settled(root);
  const viewport = page.viewportSize()!;
  expect(await box(field)).toMatchObject({ left: 8, top: 4, width: viewport.width - 16 });
  expect(await background(field)).toBe(await color(page, '--m3e-comp-search-bar-container-color'));
  const surface = await root
    .locator('.m3e-search__view')
    .evaluate((el) => getComputedStyle(el, '::before').backgroundColor);
  expect(surface).toBe(await color(page, '--m3e-comp-search-contained-container-color'));
});

test('docked: one panel at the bar, at least 240dp, results under a divider', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const root = search(page, 'docked');
  await root.scrollIntoViewIfNeeded();
  const before = await box(root);
  const { input, view, results } = parts(root);
  await input.click();
  await settled(root);
  const panel = await box(view);
  expect(panel.left).toBeCloseTo(before.left, 0);
  expect(panel.top).toBeCloseTo(before.top, 0);
  expect(panel.width).toBeCloseTo(before.width, 0);
  expect(panel.height).toBeGreaterThanOrEqual(240);
  expect(panel.height).toBeLessThanOrEqual((page.viewportSize()!.height * 2) / 3 + 0.5);
  expect((await box(results)).top - panel.top).toBe(56);
  expect(await results.evaluate((el) => getComputedStyle(el).borderTopWidth)).toBe('1px');
});

test('docked with gap: scrim, results 2dp under the field in a 12dp box; the scrim dismisses', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const root = search(page, 'docked-gap');
  const { input, field, results, view } = parts(root);
  await input.click();
  await settled(root);
  await expect(root).toHaveAttribute('data-dropdown', '');
  expect((await box(results)).top - (await box(field)).bottom).toBe(2);
  expect(await results.evaluate((el) => getComputedStyle(el).borderTopLeftRadius)).toBe('12px');
  const scrim = await view.evaluate((el) => Number(getComputedStyle(el, '::before').opacity));
  expect(scrim).toBeCloseTo(0.32, 2);
  // A click on the scrim (far from the bar) collapses.
  await page.mouse.click(5, page.viewportSize()!.height - 5);
  await expect(root).not.toHaveAttribute('data-expanded');
  await expect(root).not.toHaveAttribute('data-open');
});

test('docked: a click outside collapses; focus leaving collapses', async ({ page }) => {
  const root = search(page, 'docked');
  const { input } = parts(root);
  await input.click();
  await expect(root).toHaveAttribute('data-expanded', '');
  await page.mouse.click(5, 5);
  await expect(root).not.toHaveAttribute('data-expanded');
  await input.focus();
  await page.keyboard.press('ArrowDown');
  await expect(root).toHaveAttribute('data-expanded', '');
  // Tab past the trailing button out of the panel.
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(root).not.toHaveAttribute('data-expanded');
});

test('combobox: ArrowDown expands, arrows move aria-activedescendant, Enter selects, Escape collapses', async ({
  page,
}) => {
  const root = search(page, 'docked');
  const { input, options } = parts(root);
  await input.focus();
  // Keyboard focus alone does not expand (Compose non-touch mode).
  await expect(input).toHaveAttribute('aria-expanded', 'false');
  await expect(root).toHaveAttribute('role', 'search');
  await page.keyboard.press('ArrowDown');
  await expect(input).toHaveAttribute('aria-expanded', 'true');
  await expect(input).toHaveAttribute(
    'aria-controls',
    (await parts(root).results.getAttribute('id'))!,
  );
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  const second = (await options.nth(1).getAttribute('id'))!;
  await expect(input).toHaveAttribute('aria-activedescendant', second);
  await expect(options.nth(1)).toHaveAttribute('aria-selected', 'true');
  await expect(input).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('search-log')).toHaveText('select: Suggestion 1');
  await expect(input).toHaveValue('Suggestion 1');
  await expect(root).not.toHaveAttribute('data-expanded');
  await expect(input).not.toHaveAttribute('aria-activedescendant');
  // Typing expands; Enter without an active result searches; Escape collapses, focus stays.
  await page.keyboard.type(' x');
  await expect(root).toHaveAttribute('data-expanded', '');
  await page.keyboard.press('Escape');
  await expect(root).not.toHaveAttribute('data-expanded');
  await expect(input).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('search-log')).toHaveText('search: Suggestion 1 x');
});

test('full-screen: Tab is trapped in the view; the back button collapses and refocuses the input', async ({
  page,
}) => {
  const root = search(page, 'full-screen');
  const { input } = parts(root);
  await input.click();
  await expect(root).toHaveAttribute('data-open', '');
  const back = root.locator('.m3e-search__back');
  const mic = root.getByRole('button', { name: 'Voice search' });
  await page.keyboard.press('Tab');
  await expect(mic).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(back).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(mic).toBeFocused();
  await back.click();
  await expect(root).not.toHaveAttribute('data-expanded');
  await expect(input).toBeFocused();
  await expect(root).not.toHaveAttribute('data-open');
  // The document scroll lock is released.
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('');
});

test('AppBarWithSearch: 64dp, centered search bar, 4dp edge padding', async ({ page }) => {
  const bar = page.getByTestId('app-bar-scrolled');
  const barBox = await box(bar);
  expect(barBox.height).toBe(64);
  const searchBox = await box(bar.locator('.m3e-search'));
  expect(searchBox.height).toBe(56);
  expect(searchBox.top - barBox.top).toBe(4);
  // 360dp (SearchBarMinWidth), narrower when the space between the icons minus 8dp each side is.
  const nav = await box(bar.locator('.m3e-top-app-bar__navigation'));
  const actions = await box(bar.locator('.m3e-top-app-bar__actions'));
  expect(searchBox.width).toBeCloseTo(Math.min(360, actions.left - nav.right - 16), 0);
  expect(searchBox.left - nav.right).toBeCloseTo(actions.left - searchBox.right, 0);
  // Navigation: 4dp + a 48dp slot holding the 40dp button.
  expect((await box(bar.getByRole('button', { name: 'Menu' }))).left - barBox.left).toBe(8);
  expect(barBox.right - (await box(bar.getByRole('button', { name: 'Account' }))).right).toBe(8);
});

test('AppBarWithSearch: enter-always hides by the full height; scrolled colors (search bar not animated)', async ({
  page,
}) => {
  const scroller = page.getByTestId('app-bar-scroll');
  const bar = scroller.locator('.m3e-top-app-bar');
  const view = bar.locator('.m3e-search__view');
  expect(await background(view)).toBe(await color(page, '--m3e-comp-search-bar-container-color'));
  await scrollTo(scroller, 400);
  await expect
    .poll(() => bar.evaluate((el) => el.style.getPropertyValue('--_m3e-top-app-bar-offset')))
    .toBe('-64px');
  await expect(bar).toHaveAttribute('data-scrolled', '');
  expect(await background(view)).toBe(
    await color(page, '--m3e-comp-search-scrolled-container-color'),
  );
  // The search bar moved up by the whole offset (placeWithLayer(0, scrollOffset)).
  expect(await bar.locator('.m3e-search').evaluate((el) => getComputedStyle(el).translate)).toBe(
    '0px -64px',
  );
  await expect
    .poll(() => background(bar), { timeout: 3000 })
    .toBe(await color(page, '--m3e-comp-app-bar-on-scroll-container-color'));
  await scrollTo(scroller, 300);
  await expect
    .poll(() => bar.evaluate((el) => el.style.getPropertyValue('--_m3e-top-app-bar-offset')), {
      timeout: 3000,
    })
    .toBe('0px');
});

test('forced colors: the bar keeps a visible boundary', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' });
  const outline = await page
    .getByTestId('static-bar')
    .locator('.m3e-search__view')
    .evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).toBe('solid');
});

test('React: AppBarWithSearch + SearchBar filter, select and the same contract', async ({
  page,
}) => {
  const scroller = page.getByTestId('react-scroll');
  const root = scroller.locator('.m3e-search');
  const { input, options } = parts(root);
  await expect(root).toHaveClass('m3e-search m3e-search--docked-with-gap');
  await input.click();
  await expect(root).toHaveAttribute('data-expanded', '');
  await page.keyboard.type('ap');
  // Apple, Apricot, Grape.
  await expect(options).toHaveCount(3);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('react-log')).toHaveText('select: apple');
  await expect(input).toHaveValue('Apple');
  await expect(root).not.toHaveAttribute('data-expanded');
  await expect(scroller.locator('.m3e-top-app-bar')).toHaveAttribute(
    'data-scroll-behavior',
    'enter-always',
  );
});

test.describe('springs (frames driven by the Playwright clock)', () => {
  // Fake timers make the trace deterministic: every requestAnimationFrame and performance.now()
  // the springs see comes from page.clock, so a loaded CI machine cannot drop frames.
  test.beforeEach(async ({ page }) => {
    await page.clock.install();
    await page.reload();
    await expect(search(page, 'full-screen')).toBeVisible();
  });

  interface Frame {
    width: number;
    radius: number;
  }

  /** When (whole ms after the start, 0–20, as Compose samples springs) a 0 → 1 spring shows the value. */
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

  /** Expands `id`, recording the surface width and radius each 16ms frame; collapses at `reverseAt`. */
  async function trace(page: Page, id: string, frames: number, reverseAt = -1) {
    await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 10_000);
    await page.evaluate(
      ([testId, n, reverse]) => {
        const host = document.querySelector<HTMLElement & { expand(): void; collapse(): void }>(
          `[data-testid="${testId}"]`,
        )!;
        const root = host.querySelector<HTMLElement>('.m3e-search')!;
        const out: { width: number; radius: number }[] = [];
        (window as unknown as { searchTrace: typeof out }).searchTrace = out;
        const frame = () => {
          out.push({
            width: Number.parseFloat(root.style.getPropertyValue('--_m3e-search-surface-width')),
            radius: Number.parseFloat(root.style.getPropertyValue('--_m3e-search-surface-radius')),
          });
          if (out.length === reverse) host.collapse();
          if (out.length < n) requestAnimationFrame(frame);
        };
        host.expand();
        requestAnimationFrame(frame);
      },
      [id, frames, reverseAt] as const,
    );
    await page.clock.runFor(16 * frames + 100);
    return page.evaluate(() => (window as unknown as { searchTrace: Frame[] }).searchTrace);
  }

  test('full-screen expands on the slow spatial spring (overshoot clamped), interruptible with velocity kept', async ({
    page,
  }) => {
    const slow = {
      dampingRatio: Number(await token(page, '--m3e-sys-motion-spring-slow-spatial-damping-ratio')),
      stiffness: Number(await token(page, '--m3e-sys-motion-spring-slow-spatial-stiffness')),
    };
    const collapse = {
      dampingRatio: Number(
        await token(page, '--m3e-sys-motion-spring-default-spatial-damping-ratio'),
      ),
      stiffness: Number(await token(page, '--m3e-sys-motion-spring-default-spatial-stiffness')),
    };
    const collapsed = (await box(search(page, 'full-screen'))).width;
    const full = page.viewportSize()!.width;
    // width = lerp(collapsed, window, progress); NaN once the view has closed (variables removed).
    const progress = (f: Frame) =>
      Number.isNaN(f.width) ? 0 : (f.width - collapsed) / (full - collapsed);
    const frames = await trace(page, 'full-screen', 60);
    const p = frames.map(progress);
    // The clock's frames are not aligned with expand(): find when the first one was drawn, then
    // every frame i (16ms apart) shows the slow spatial spring, clamped at 1
    // (SearchBarState.progress), with the radius going from 28dp to 0.
    const t0 = firstFrame(slow, p[0]!);
    for (let i = 0; i < 30; i++) {
      const expected = Math.min(springValue(slow, t0 + 16 * i, 0, 1), 1);
      expect(p[i]!, 'frame ' + String(i)).toBeCloseTo(expected, 3);
    }
    expect(
      new Set(frames.slice(0, 20).map((f) => Math.round(f.width))).size,
    ).toBeGreaterThanOrEqual(8);
    expect(Math.max(...frames.map((f) => f.width))).toBeLessThanOrEqual(full + 0.01);
    expect(frames.at(-1)!.radius).toBe(0);
    expect(frames.at(-1)!.width).toBeCloseTo(full, 1);

    // Reversed at frame 10 (160ms): the collapse spring starts from the expand spring's value
    // and velocity there (Animatable.animateTo), so the next frames keep moving outward first.
    await page.reload();
    await expect(search(page, 'full-screen')).toBeVisible();
    const reversed = (await trace(page, 'full-screen', 60, 10)).map(progress);
    // collapse() ran in the 10th frame's callback, at t0 + 9 · 16ms.
    const at = firstFrame(slow, reversed[0]!) + 9 * 16;
    const from = springValue(slow, at, 0, 1);
    const velocity = springVelocity(slow, at, 0, 1);
    for (let i = 10; i < 25; i++) {
      const expected = springValue(collapse, 16 * (i - 9), from, 0, velocity);
      expect(reversed[i]!, 'frame ' + String(i)).toBeCloseTo(Math.min(Math.max(expected, 0), 1), 3);
    }
    expect(reversed[10]!).toBeGreaterThan(reversed[9]! - 0.02);
    expect(reversed.at(-1)!).toBe(0);
  });
});
