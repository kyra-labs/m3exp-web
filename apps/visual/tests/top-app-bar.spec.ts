import AxeBuilder from '@axe-core/playwright';
import { springValue, twoRowsFrame } from '@kyralabs/m3e-motion';
import { type Locator, type Page, expect, test } from '@playwright/test';

// Top app bars (COMPONENT_SPEC §11): small, center-aligned, medium / large flexible and two-rows.
// Acceptance + light/dark × 3 browsers baselines (static variants expanded, the collapsing demos
// collapsed and half collapsed), axe, and the snap spring traced on the Playwright clock.
const box = (el: Locator) =>
  el.evaluate((node) => {
    const { left, right, top, height } = node.getBoundingClientRect();
    return { left, right, top, height };
  });
const token = (page: Page, name: string) =>
  page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
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
const offset = (bar: Locator) =>
  bar.evaluate((el) => el.style.getPropertyValue('--_m3e-top-app-bar-offset'));
/** A `--_m3e-top-app-bar-<name>` value the scroll behavior wrote on the bar. */
const prop = (bar: Locator, name: string) =>
  bar.evaluate((el, n) => el.style.getPropertyValue(`--_m3e-top-app-bar-${n}`), name);
/** Any CSS color as [r, g, b] (canvas), so color-mix() results compare with rgb() tokens. */
const rgb = (page: Page, css: string) =>
  page.evaluate((c) => {
    const ctx = document.createElement('canvas').getContext('2d')!;
    ctx.fillStyle = c;
    ctx.fillRect(0, 0, 1, 1);
    return [...ctx.getImageData(0, 0, 1, 1).data.slice(0, 3)];
  }, css);
const expectColor = (actual: number[], expected: number[], what: string) => {
  for (let i = 0; i < 3; i++)
    expect(Math.abs(actual[i]! - expected[i]!), what).toBeLessThanOrEqual(2);
};
const background = (el: Locator) => el.evaluate((node) => getComputedStyle(node).backgroundColor);
const scrollTo = (scroller: Locator, top: number) =>
  scroller.evaluate((el, t) => {
    el.scrollTo({ top: t, behavior: 'instant' });
  }, top);

test.beforeEach(async ({ page }) => {
  await page.goto('/components/top-app-bar/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByTestId('react-scroll').locator('.m3e-top-app-bar')).toBeVisible();
});

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
const COLLAPSING = ['scroll-medium', 'scroll-large', 'scroll-two-rows'] as const;

test('has no axe violations (expanded and collapsed)', async ({ page }) => {
  // Two full-page axe runs: WebKit under load can need more than the default 30s.
  test.slow();
  expect((await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()).violations).toEqual([]);
  for (const id of COLLAPSING) {
    const scroller = page.getByTestId(id);
    await scrollTo(scroller, 400);
    await expect
      .poll(() => prop(scroller.locator('.m3e-top-app-bar'), 'collapsed-title-opacity'))
      .toBe('1');
  }
  expect((await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()).violations).toEqual([]);
});

test('matches the visual baseline', async ({ page }) => {
  await expect(page).toHaveScreenshot('top-app-bar.png', { fullPage: true });
});

test('expanded height matches AppBarSmallTokens.ContainerHeight', async ({ page }) => {
  const height = Number.parseFloat(await token(page, '--m3e-comp-app-bar-small-container-height'));
  for (const id of ['title-only', 'full', 'subtitle']) {
    expect((await box(page.getByTestId(id))).height, id).toBe(height);
  }
});

test('layout follows TopAppBarLayout (title inset, 48dp icon slots, 4dp edge padding)', async ({
  page,
}) => {
  const titleOnly = page.getByTestId('title-only');
  const bar = await box(titleOnly);
  // No navigation icon: title box at TopAppBarTitleInset (12) + title padding (4).
  expect((await box(titleOnly.locator('.m3e-top-app-bar__title'))).left - bar.left).toBe(16);

  const full = page.getByTestId('full');
  const fullBox = await box(full);
  // Navigation: 4dp padding + a 48dp slot holding the 40dp button; title after it + 4dp padding.
  expect((await box(full.getByRole('button', { name: 'Menu' }))).left - fullBox.left).toBe(8);
  expect((await box(full.locator('.m3e-top-app-bar__title'))).left - fullBox.left).toBe(56);
  // Actions: last button's 48dp slot ends 4dp from the edge.
  expect(fullBox.right - (await box(full.getByRole('button', { name: 'Favorite' }))).right).toBe(8);
});

test('container color changes when content scrolls under the bar', async ({ page }) => {
  const scroller = page.getByTestId('scroll-pinned');
  const bar = scroller.locator('.m3e-top-app-bar');
  const background = () => bar.evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(await background()).toBe(await color(page, '--m3e-comp-app-bar-container-color'));
  await scrollTo(scroller, 120);
  await expect(bar).toHaveAttribute('data-scrolled', '');
  const scrolled = await color(page, '--m3e-comp-app-bar-on-scroll-container-color');
  await expect.poll(background, { timeout: 3000 }).toBe(scrolled);
  // Pinned bars never move.
  expect(await offset(bar)).toBe('');
  await scrollTo(scroller, 0);
  await expect(bar).not.toHaveAttribute('data-scrolled');
});

test('enter-always: collapses to 0 and expands back to the token height', async ({ page }) => {
  const scroller = page.getByTestId('scroll-enter-always');
  const bar = scroller.locator('.m3e-top-app-bar');
  await scrollTo(scroller, 400);
  await expect.poll(() => offset(bar)).toBe('-64px');
  // Fully clipped: nothing of the bar is hit-testable at its top edge.
  await scroller.scrollIntoViewIfNeeded();
  const barBox = (await bar.boundingBox())!;
  const hit = await page.evaluate(
    ({ x, y }) => document.elementFromPoint(x, y)?.closest('.m3e-top-app-bar') !== null,
    { x: barBox.x + barBox.width / 2, y: barBox.y + 2 },
  );
  expect(hit).toBe(false);
  // Scrolling up any amount brings it back; the settle snaps it fully open or closed.
  await scrollTo(scroller, 360);
  await expect.poll(() => offset(bar), { timeout: 3000 }).toMatch(/^(0|-64)px$/);
  await scrollTo(scroller, 300);
  await expect.poll(() => offset(bar), { timeout: 3000 }).toBe('0px');
});

test('enter-always: focus brings a hidden bar back', async ({ page }) => {
  const scroller = page.getByTestId('scroll-enter-always');
  const bar = scroller.locator('.m3e-top-app-bar');
  await scrollTo(scroller, 400);
  await expect.poll(() => offset(bar)).toBe('-64px');
  await bar.getByRole('button', { name: 'Menu' }).focus();
  await expect.poll(() => offset(bar), { timeout: 3000 }).toBe('0px');
});

test('React: same behavior through <TopAppBar scrollBehavior>', async ({ page }) => {
  const scroller = page.getByTestId('react-scroll');
  const bar = scroller.locator('.m3e-top-app-bar');
  await expect(bar).toHaveAttribute('data-scroll-behavior', 'enter-always');
  await scrollTo(scroller, 400);
  await expect.poll(() => offset(bar)).toBe('-64px');
  await expect(bar).toHaveAttribute('data-scrolled', '');
});

// --- Center-aligned, medium / large flexible and two-rows bars (M6) ---------------------------

const px = async (page: Page, name: string) => Number.parseFloat(await token(page, name));
const headlines = (bar: Locator) => ({
  collapsed: bar.locator('> .m3e-top-app-bar__headline'),
  expanded: bar.locator('.m3e-top-app-bar__expanded > .m3e-top-app-bar__headline'),
  row: bar.locator('.m3e-top-app-bar__expanded'),
});

test('expanded and top-row heights match the generated TopAppBarDefaults for every variant', async ({
  page,
}) => {
  const t = (name: string) => px(page, `--m3e-comp-top-app-bar-${name}`);
  const expected: [string, number][] = [
    ['center', await t('expanded-height')],
    ['center-subtitle', await t('expanded-height')],
    ['medium', await t('medium-flexible-expanded-height')],
    ['medium-subtitle', await t('medium-flexible-with-subtitle-expanded-height')],
    ['medium-center', await t('medium-flexible-with-subtitle-expanded-height')],
    ['large', await t('large-flexible-expanded-height')],
    ['large-subtitle', await t('large-flexible-with-subtitle-expanded-height')],
    ['large-center', await t('large-flexible-with-subtitle-expanded-height')],
    ['two-rows', 156], // CustomTwoRowsTopAppBar's expandedHeight
  ];
  expect(expected.map(([, h]) => h)).toEqual([64, 64, 112, 136, 136, 120, 152, 152, 156]);
  for (const [id, height] of expected) {
    const bar = page.getByTestId(id);
    expect((await box(bar)).height, id).toBeCloseTo(height, 0);
    if (id.startsWith('center')) continue;
    // The top row is the collapsed height (64dp, the small bar's).
    const top = (await box(headlines(bar).row)).top - (await box(bar)).top;
    expect(top, id).toBeCloseTo(await t('medium-collapsed-height'), 0);
  }
});

test('title and subtitle styles per variant (AppBar*Tokens)', async ({ page }) => {
  const font = (el: Locator) =>
    el.evaluate((node) => {
      const cs = getComputedStyle(node);
      return [cs.fontSize, cs.lineHeight, cs.fontWeight];
    });
  /** The typescale style resolved on a probe (tokens are rem). */
  const typescale = (name: string) =>
    page.evaluate((n) => {
      const probe = document.createElement('p');
      probe.style.fontSize = `var(--m3e-sys-typescale-${n}-size)`;
      probe.style.lineHeight = `var(--m3e-sys-typescale-${n}-line-height)`;
      probe.style.fontWeight = `var(--m3e-sys-typescale-${n}-weight)`;
      document.body.append(probe);
      const cs = getComputedStyle(probe);
      const out = [cs.fontSize, cs.lineHeight, cs.fontWeight];
      probe.remove();
      return out;
    }, name);
  const cases: [string, string, string, string, string][] = [
    // id, expanded title, expanded subtitle, collapsed title, collapsed subtitle
    ['medium-subtitle', 'headline-medium', 'label-large', 'title-large', 'label-medium'],
    ['large-subtitle', 'display-small', 'title-medium', 'title-large', 'label-medium'],
    ['two-rows', 'headline-medium', 'label-large', 'title-large', 'label-medium'],
  ];
  for (const [id, title, subtitle, smallTitle, smallSubtitle] of cases) {
    const h = headlines(page.getByTestId(id));
    const title$ = '.m3e-top-app-bar__title';
    const subtitle$ = '.m3e-top-app-bar__subtitle';
    expect(await font(h.expanded.locator(title$)), id).toEqual(await typescale(title));
    expect(await font(h.expanded.locator(subtitle$)), id).toEqual(await typescale(subtitle));
    expect(await font(h.collapsed.locator(title$)), id).toEqual(await typescale(smallTitle));
    expect(await font(h.collapsed.locator(subtitle$)), id).toEqual(await typescale(smallSubtitle));
  }
  // The center-aligned bar keeps the small title style.
  expect(await font(page.getByTestId('center').locator('.m3e-top-app-bar__title'))).toEqual(
    await typescale('title-large'),
  );
});

test('center-aligned: the title is centered on the whole bar, between the navigation and actions', async ({
  page,
}) => {
  const center = async (el: Locator) => {
    const b = await box(el);
    return (b.left + b.right) / 2;
  };
  for (const id of ['center', 'center-subtitle', 'medium-center', 'large-center']) {
    const bar = page.getByTestId(id);
    const middle = await center(bar);
    for (const title of await bar.locator('.m3e-top-app-bar__title').all())
      expect(await center(title), id).toBeCloseTo(middle, 0);
  }
  // A title too wide to be centered is moved aside but stays clear of the actions.
  const bar = page.getByTestId('center-subtitle');
  const headline = bar.locator('.m3e-top-app-bar__headline');
  await headline.locator('.m3e-top-app-bar__title').evaluate((el) => {
    el.textContent = 'A centered title long enough to meet the actions';
    (el as HTMLElement).style.whiteSpace = 'nowrap';
    (el as HTMLElement).style.overflow = 'hidden';
    (el as HTMLElement).style.textOverflow = 'ellipsis';
  });
  const actions = await box(bar.locator('.m3e-top-app-bar__actions'));
  const nav = await box(bar.locator('.m3e-top-app-bar__navigation'));
  const h = await box(headline);
  expect(h.right).toBeLessThanOrEqual(actions.left + 0.5);
  expect(h.left).toBeGreaterThanOrEqual(nav.right - 0.5);
});

test('expanded title: last baseline titleBottomPadding above the bottom, top-clamped, flush for two-rows', async ({
  page,
}) => {
  /** Appends a zero-size inline-block at the end of `el`'s text: its bottom is the baseline. */
  const baseline = (el: Locator) =>
    el.evaluate((node) => {
      const probe = document.createElement('span');
      probe.style.cssText = 'display:inline-block;inline-size:0;block-size:0';
      node.prepend(probe);
      const y = probe.getBoundingClientRect().bottom;
      probe.remove();
      return y;
    });
  // Default heights: the padding does not fit, so the title sits at the top of its row (Compose's
  // adjustedBottomPadding).
  for (const id of ['medium', 'medium-subtitle', 'large', 'large-subtitle']) {
    const h = headlines(page.getByTestId(id));
    expect((await box(h.expanded)).top, id).toBeCloseTo((await box(h.row)).top, 0);
  }
  // Room to spare (a 200dp medium flexible bar): the subtitle's baseline 24dp above the bottom.
  const medium = page.getByTestId('medium-subtitle');
  await medium.evaluate((el) => {
    el.style.setProperty('--_m3e-top-app-bar-expanded-height', '200px');
  });
  const h = headlines(medium);
  expect((await box(medium)).height).toBeCloseTo(200, 0);
  const padding = await px(page, '--m3e-comp-top-app-bar-medium-title-bottom-padding');
  const rowBottom = (await box(h.row)).top + (await box(h.row)).height;
  expect(
    rowBottom - (await baseline(h.expanded.locator('.m3e-top-app-bar__subtitle'))),
  ).toBeCloseTo(padding, 0);
  // TwoRowsTopAppBar: no bottom padding, the headline box on the bottom edge.
  const two = headlines(page.getByTestId('two-rows'));
  const twoRow = await box(two.row);
  const sub = await box(two.expanded.locator('.m3e-top-app-bar__subtitle'));
  expect(sub.top + sub.height).toBeCloseTo(twoRow.top + twoRow.height, 0);
});

test('two-rows static: expanded title shown, collapsed title transparent and aria-hidden', async ({
  page,
}) => {
  const h = headlines(page.getByTestId('medium-subtitle'));
  expect(await h.collapsed.evaluate((el) => getComputedStyle(el).opacity)).toBe('0');
  expect(await h.expanded.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
  await expect(h.collapsed).toHaveAttribute('aria-hidden', 'true');
  await expect(h.expanded).not.toHaveAttribute('aria-hidden');
  // Container color at collapsed fraction 0 = the container color.
  expectColor(
    await rgb(page, await background(page.getByTestId('medium-subtitle'))),
    await rgb(page, await color(page, '--m3e-comp-app-bar-container-color')),
    'expanded container',
  );
});

test('exit-until-collapsed: collapses to the small bar height and expands at the content start', async ({
  page,
}) => {
  for (const id of COLLAPSING) {
    const scroller = page.getByTestId(id);
    const bar = scroller.locator('.m3e-top-app-bar');
    const h = headlines(bar);
    const full = (await box(bar)).height;
    const rowHeight = (await box(h.row)).height;
    await scrollTo(scroller, 400);
    await expect.poll(() => offset(bar), { message: id }).toBe(`${String(-rowHeight)}px`);
    // Visible: the top row only (clip-path), 64dp.
    const visible = await bar.evaluate((el) => {
      const clip = getComputedStyle(el).clipPath;
      return { clip, height: el.getBoundingClientRect().height };
    });
    expect(visible.clip, id).toContain('inset');
    expect(full - rowHeight, id).toBeCloseTo(64, 0);
    expect(await prop(bar, 'collapsed-title-opacity')).toBe('1');
    expect(await prop(bar, 'expanded-title-opacity')).toBe('0');
    await expect(h.collapsed).not.toHaveAttribute('aria-hidden');
    await expect(h.expanded).toHaveAttribute('aria-hidden', 'true');
    expectColor(
      await rgb(page, await background(bar)),
      await rgb(page, await color(page, '--m3e-comp-app-bar-on-scroll-container-color')),
      `${id} collapsed container`,
    );
    // Nothing of the expanded row is hit-testable below the top row.
    await scroller.scrollIntoViewIfNeeded();
    const b = (await bar.boundingBox())!;
    const hit = await page.evaluate(
      ({ x, y }) => document.elementFromPoint(x, y)?.closest('.m3e-top-app-bar__expanded') !== null,
      { x: b.x + b.width / 2, y: b.y + 64 + 8 },
    );
    expect(hit, id).toBe(false);
    // Scrolling up mid-content leaves it collapsed; reaching the start expands it.
    await scrollTo(scroller, 250);
    await expect.poll(() => offset(bar)).toBe(`${String(-rowHeight)}px`);
    await scrollTo(scroller, 0);
    await expect.poll(() => offset(bar)).toBe('0px');
    await expect(h.collapsed).toHaveAttribute('aria-hidden', 'true');
  }
});

test('collapsed baselines (scrolled to the top row)', async ({ page }) => {
  for (const id of COLLAPSING) {
    const scroller = page.getByTestId(id);
    await scrollTo(scroller, 400);
    await expect.poll(() => prop(scroller.locator('.m3e-top-app-bar'), 'color-fraction')).toBe('1');
  }
  const row = page.locator('.docs-app-bar-demos');
  await row.scrollIntoViewIfNeeded();
  await expect(page).toHaveScreenshot('top-app-bar-collapsed.png', {
    clip: (await row.boundingBox())!,
  });
});

test('React: two-rows variants, centered title and exit-until-collapsed', async ({ page }) => {
  const scroller = page.getByTestId('react-scroll');
  const bar = scroller.locator('.m3e-top-app-bar');
  await page.getByTestId('react-variant').selectOption('large-flexible');
  await page.getByTestId('react-behavior').selectOption('exit-until-collapsed');
  await page.getByTestId('react-centered').check();
  await expect(bar).toHaveClass(
    'm3e-top-app-bar m3e-top-app-bar--large-flexible m3e-top-app-bar--center-aligned docs-sticky',
  );
  await expect(bar).toHaveAttribute('data-scroll-behavior', 'exit-until-collapsed');
  expect((await box(bar)).height).toBeCloseTo(152, 0);
  await scrollTo(scroller, 400);
  await expect.poll(() => offset(bar)).toBe('-88px');
  await expect(headlines(bar).collapsed).not.toHaveAttribute('aria-hidden');
  await expect(headlines(bar).expanded).toHaveAttribute('aria-hidden', 'true');
  await page.getByTestId('react-variant').selectOption('two-rows');
  await expect(bar.locator('.m3e-top-app-bar__expanded .m3e-top-app-bar__title')).toHaveText(
    'React, expanded',
  );
});

test('RTL: the two-rows layout mirrors (logical properties)', async ({ page }) => {
  const bar = page.getByTestId('medium-subtitle');
  await bar.evaluate((el) => {
    el.setAttribute('dir', 'rtl');
  });
  const b = await box(bar);
  const nav = await box(bar.getByRole('button', { name: 'Menu' }));
  expect(b.right - nav.right).toBeCloseTo(8, 0);
  const title = await box(headlines(bar).expanded.locator('.m3e-top-app-bar__title'));
  expect(b.right - title.right).toBeCloseTo(16, 0);
  const collapsedTitle = await box(headlines(bar).collapsed.locator('.m3e-top-app-bar__title'));
  expect(b.right - collapsedTitle.right).toBeCloseTo(56, 0);
});

test('touch targets: navigation and actions keep 48dp slots in every variant', async ({ page }) => {
  for (const id of ['center', 'medium', 'large-center', 'two-rows']) {
    const bar = page.getByTestId(id);
    const b = await box(bar);
    const nav = await box(bar.getByRole('button', { name: 'Menu' }));
    // 4dp padding + the 48dp slot centering the 40dp button.
    expect(nav.left - b.left, id).toBeCloseTo(8, 0);
    const action = await box(bar.locator('.m3e-top-app-bar__actions button').last());
    expect(b.right - action.right, id).toBeCloseTo(8, 0);
  }
});

test.describe('snap (frames driven by the Playwright clock)', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install();
    await page.reload();
    await expect(page.getByTestId('scroll-medium').locator('.m3e-top-app-bar')).toHaveAttribute(
      'data-scroll-behavior',
      'exit-until-collapsed',
    );
  });

  /**
   * Scrolls the medium flexible demo (with a subtitle: a 136 - 64 = 72dp expanded row) to `top`, ends
   * the scroll (the snap starts), then records the offset once per 16ms frame; at frame
   * `scrollAt` it scrolls to `scrollTop2` (a scroll takes over from the snap).
   */
  async function trace(page: Page, top: number, frames: number, scrollAt = -1, scrollTop2 = 0) {
    await page.getByTestId('scroll-medium').scrollIntoViewIfNeeded();
    await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 10_000);
    await page.evaluate(
      ([t, n, at, t2]) => {
        const scroller = document.querySelector<HTMLElement>('[data-testid="scroll-medium"]')!;
        const bar = scroller.querySelector<HTMLElement>('.m3e-top-app-bar')!;
        const out: { offset: number; alpha: number }[] = [];
        (window as unknown as { snapTrace: typeof out }).snapTrace = out;
        const read = () => ({
          offset: Number.parseFloat(bar.style.getPropertyValue('--_m3e-top-app-bar-offset')),
          alpha: Number(bar.style.getPropertyValue('--_m3e-top-app-bar-expanded-title-opacity')),
        });
        const frame = () => {
          out.push(read());
          if (out.length === at) {
            scroller.scrollTop = t2;
            scroller.dispatchEvent(new Event('scroll'));
          }
          if (out.length < n) requestAnimationFrame(frame);
        };
        scroller.scrollTop = t;
        scroller.dispatchEvent(new Event('scroll'));
        out.push(read());
        scroller.dispatchEvent(new Event('scrollend'));
        requestAnimationFrame(frame);
      },
      [top, frames, scrollAt, scrollTop2] as const,
    );
    await page.clock.runFor(16 * frames + 100);
    return page.evaluate(
      () => (window as unknown as { snapTrace: { offset: number; alpha: number }[] }).snapTrace,
    );
  }

  test('the scroll-tied state before the snap follows twoRowsFrame', async ({ page }) => {
    const [first] = await trace(page, 30, 1);
    // 30 of the 72dp expanded row: fraction 30 / 72.
    expect(first!.offset).toBe(-30);
    expect(first!.alpha).toBeCloseTo(twoRowsFrame(30 / 72).expandedTitleAlpha, 6);
  });

  test('a partly collapsed bar snaps on the default effects spring over many frames, without overshoot', async ({
    page,
  }) => {
    const spec = {
      dampingRatio: await px(page, '--m3e-comp-top-app-bar-snap-damping-ratio'),
      stiffness: await px(page, '--m3e-comp-top-app-bar-snap-stiffness'),
    };
    expect(spec).toEqual({
      dampingRatio: await px(page, '--m3e-sys-motion-spring-default-effects-damping-ratio'),
      stiffness: await px(page, '--m3e-sys-motion-spring-default-effects-stiffness'),
    });
    // 40 of 72: fraction 0.56 ≥ 0.5 → collapses to -72 (settleAppBar).
    const offsets = (await trace(page, 40, 30)).map((f) => f.offset);
    expect(offsets[0]).toBe(-40);
    expect(new Set(offsets.slice(1, 10).map((o) => o.toFixed(1))).size).toBeGreaterThanOrEqual(4);
    for (let i = 1; i < offsets.length; i++) {
      expect(offsets[i]!, `frame ${String(i)}`).toBeLessThanOrEqual(offsets[i - 1]!);
      expect(offsets[i]!).toBeGreaterThanOrEqual(-72);
    }
    expect(offsets.at(-1)).toBe(-72);
    // The frames are the spring from rest (Compose AnimationState(initialValue = heightOffset))
    // sampled frame by frame: every frame lies on that spring at a later time than the frame before,
    // at most a few frames on (a browser may run two callbacks per frame or skip one).
    const at = (t: number) => springValue(spec, t, -40, -72);
    const first = offsets.findIndex((o) => o < -40);
    let time = 0;
    for (let i = first; i < first + 8; i++) {
      const candidates = Array.from({ length: 49 }, (_, k) => time + k);
      const best = candidates.reduce((b, t) =>
        Math.abs(at(t) - offsets[i]!) < Math.abs(at(b) - offsets[i]!) ? t : b,
      );
      expect(Math.abs(at(best) - offsets[i]!), `frame ${String(i)}`).toBeLessThan(0.75);
      time = best;
    }
  });

  test('a scroll during the snap takes over (interruptible)', async ({ page }) => {
    const offsets = (await trace(page, 30, 8, 4, 50)).map((f) => f.offset);
    // Snapping open (30 / 72 < 0.5) until frame 4, then the content scrolls 20px down: the snap
    // stops and the bar collapses by the scroll from wherever the snap had brought it.
    expect(offsets[3]!).toBeGreaterThan(-30);
    expect(offsets[4]!).toBeLessThan(offsets[3]!);
    expect(offsets[4]! - offsets[3]!).toBeGreaterThan(-23);
    expect(offsets[4]! - offsets[3]!).toBeLessThan(-17);
  });

  test('a half-collapsed frame matches the baseline (no snap: the clock is paused)', async ({
    page,
  }) => {
    const scroller = page.getByTestId('scroll-medium');
    await scroller.scrollIntoViewIfNeeded();
    await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 10_000);
    await scroller.evaluate((el) => {
      el.scrollTop = 36; // half of the 72dp expanded row
      el.dispatchEvent(new Event('scroll'));
    });
    const bar = scroller.locator('.m3e-top-app-bar');
    expect(await offset(bar)).toBe('-36px');
    expect(await prop(bar, 'expanded-title-opacity')).toBe('0.5');
    await expect(page).toHaveScreenshot('top-app-bar-half-collapsed.png', {
      clip: (await scroller.boundingBox())!,
    });
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the snap jumps (geometry on an effects spring, project policy)', async ({ page }) => {
    const value = await page.getByTestId('scroll-medium').evaluate(async (el) => {
      el.scrollTop = 40;
      el.dispatchEvent(new Event('scroll'));
      el.dispatchEvent(new Event('scrollend'));
      await new Promise((r) => requestAnimationFrame(r));
      return el
        .querySelector<HTMLElement>('.m3e-top-app-bar')!
        .style.getPropertyValue('--_m3e-top-app-bar-offset');
    });
    expect(value).toBe('-72px');
  });
});

test.describe('forced colors', () => {
  test.use({ forcedColors: 'active' });

  test('the bar keeps a visible lower edge', async ({ page }) => {
    for (const id of ['full', 'center', 'medium-subtitle']) {
      const style = await page
        .getByTestId(id)
        .evaluate((el) => getComputedStyle(el).borderBottomStyle);
      expect(style, id).toBe('solid');
    }
  });
});
