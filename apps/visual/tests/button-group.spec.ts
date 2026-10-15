import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';

// Button group (COMPONENT_SPEC §3): acceptance + light/dark × 3 browsers baselines, axe, traces.
const box = async (el: Locator) => (await el.boundingBox())!;
const token = (page: Page, name: string) =>
  page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
const px = async (page: Page, name: string) => Number.parseFloat(await token(page, name));
const radii = (el: Locator) =>
  el.evaluate((node) => {
    const s = getComputedStyle(node);
    // top-left, top-right, bottom-right, bottom-left
    return [
      s.borderTopLeftRadius,
      s.borderTopRightRadius,
      s.borderBottomRightRadius,
      s.borderBottomLeftRadius,
    ].map((v) => Math.round(Number.parseFloat(v) * 10) / 10);
  });
const items = (scope: Locator) => scope.locator('.m3e-button-group__item');
const widths = (scope: Locator) =>
  items(scope).evaluateAll((els) => els.map((el) => el.getBoundingClientRect().width));
const sum = (a: readonly number[]) => a.reduce((s, v) => s + v, 0);
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
const SIZES = [
  ['xs', 'x-small'],
  ['s', 'small'],
  ['m', 'medium'],
  ['l', 'large'],
  ['xl', 'x-large'],
] as const;

test.beforeEach(async ({ page }) => {
  await page.goto('/components/button-group/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByTestId('react-standard')).toBeVisible();
});

test('has no axe violations', async ({ page }) => {
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  expect(results.violations).toEqual([]);
});

test('has no axe violations with the overflow menus open (element, React)', async ({ page }) => {
  for (const id of ['el-overflow', 'react-overflow']) {
    const trigger = page.getByTestId(`${id}-box`).locator('.m3e-button-group__overflow');
    await trigger.click();
    await expect(page.locator('.m3e-menu:popover-open')).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
    expect(results.violations).toEqual([]);
    await page.keyboard.press('Escape');
    await expect(page.locator('.m3e-menu:popover-open')).toHaveCount(0);
  }
});

test('standard groups match the visual baseline', async ({ page }) => {
  await expect(page.getByTestId('standard')).toHaveScreenshot('button-group-standard.png');
});

test('connected groups match the visual baseline', async ({ page }) => {
  await expect(page.getByTestId('connected')).toHaveScreenshot('button-group-connected.png');
});

test('between-space per size: generated tokens (XS 18, S 12, M/L/XL 8)', async ({ page }) => {
  const expected = { xs: 18, s: 12, m: 8, l: 8, xl: 8 } as const;
  for (const [size, words] of SIZES) {
    const group = page.getByTestId(`standard-${size}`);
    const [a, b] = await items(group).all();
    const gap = (await box(b!)).x - ((await box(a!)).x + (await box(a!)).width);
    expect(gap, size).toBeCloseTo(
      await px(page, `--m3e-comp-button-group-${words}-between-space`),
      1,
    );
    expect(gap, size).toBeCloseTo(expected[size], 1);
    // The group adapts to the height of its buttons (m3.material.io).
    expect((await box(a!)).height, size).toBeCloseTo(
      await px(page, `--m3e-comp-button-${words}-container-height`),
      1,
    );
    const connected = page.getByTestId(`connected-round-${size}`);
    const [c, d] = await items(connected).all();
    expect((await box(d!)).x - ((await box(c!)).x + (await box(c!)).width), size).toBeCloseTo(2, 1);
  }
});

test('connected corners: outer round, inner per size, selected round; square keeps inner', async ({
  page,
}) => {
  for (const [size, words] of SIZES) {
    const inner = await px(
      page,
      `--m3e-comp-connected-button-group-${words}-inner-corner-corner-size`,
    );
    const [first, selected, last] = await items(page.getByTestId(`connected-round-${size}`)).all();
    const h = (await box(first!)).height;
    expect(await radii(first!), size).toEqual([h / 2, inner, inner, h / 2]);
    expect(await radii(last!), size).toEqual([inner, h / 2, h / 2, inner]);
    expect(await radii(selected!), size).toEqual([h / 2, h / 2, h / 2, h / 2]);
    const [sqFirst] = await items(page.getByTestId(`connected-square-${size}`)).all();
    expect(await radii(sqFirst!), size).toEqual([inner, inner, inner, inner]);
  }
  // RTL: logical corners mirror (the first item's outer corners are on the right).
  const [rtlFirst, , rtlLast] = await items(page.getByTestId('rtl')).all();
  const h = (await box(rtlLast!)).height;
  const inner = await px(page, '--m3e-comp-connected-button-group-small-inner-corner-corner-size');
  expect((await box(rtlFirst!)).x).toBeGreaterThan((await box(rtlLast!)).x);
  expect(await radii(rtlLast!)).toEqual([h / 2, inner, inner, h / 2]);
});

test('connected: pressing tightens the inner corners only; selection morphs them round', async ({
  page,
}) => {
  const group = page.getByTestId('el-connected');
  const [, restaurant] = await items(group).all();
  const pressed = await px(
    page,
    '--m3e-comp-connected-button-group-small-inner-corner-corner-size-pressed',
  );
  await restaurant!.scrollIntoViewIfNeeded();
  const b = await box(restaurant!);
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await expect.poll(() => radii(restaurant!)).toEqual([pressed, pressed, pressed, pressed]);
  // Connected groups never change their neighbors' widths.
  const before = await widths(group);
  await page.mouse.up();
  await expect(restaurant!).toHaveAttribute('aria-checked', 'true');
  await expect.poll(() => radii(restaurant!)).toEqual(Array(4).fill(b.height / 2));
  expect(await widths(group)).toEqual(before);
  await expect(page.locator('#el-log')).toHaveText('change: restaurant');
});

test('pressed item grows by ExpandedRatio, neighbors shrink, total width constant', async ({
  page,
}) => {
  // The Playwright clock drives the frames (WebKit may hold rAF while the mouse is down).
  await page.clock.install();
  await page.reload();
  await expect(page.getByTestId('react-standard').locator('button')).toHaveCount(3);
  for (const id of ['el-standard', 'react-standard']) {
    const group = page.getByTestId(id);
    const rest = await widths(group);
    const [, play] = await items(group).all();
    const limits = await items(group).evaluateAll((els) =>
      els.map((el) => Number.parseFloat(getComputedStyle(el).paddingInlineEnd)),
    );
    const ratio = await px(page, '--m3e-comp-button-group-expanded-ratio');
    expect(ratio).toBe(0.15);
    await play!.scrollIntoViewIfNeeded();
    const b = await box(play!);
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.clock.runFor(1500);
    const pressed = await widths(group);
    const growth = Math.min((ratio * rest[1]!) / 2, limits[0]!, limits[2]!);
    expect(pressed[1]!, id).toBeCloseTo(rest[1]! + 2 * growth, 1);
    expect(pressed[0]!, id).toBeCloseTo(rest[0]! - growth, 1);
    expect(pressed[2]!, id).toBeCloseTo(rest[2]! - growth, 1);
    expect(sum(pressed), id).toBeCloseTo(sum(rest), 1);
    await page.mouse.up();
    await page.clock.runFor(2000);
    const after = await widths(group);
    after.forEach((w, i) => {
      expect(w, id).toBeCloseTo(rest[i]!, 1);
    });
    // At rest the inline widths are gone: m3e-css holds the layout again.
    expect(await play!.evaluate((el) => (el as HTMLElement).style.inlineSize)).toBe('');
  }
});

test.describe('width spring (frames driven by the Playwright clock)', () => {
  // Fake timers make the trace deterministic: every requestAnimationFrame and performance.now()
  // the springs see comes from page.clock, so a loaded CI machine cannot drop frames.
  test.beforeEach(async ({ page }) => {
    await page.clock.install();
    await page.reload();
    await expect(page.getByTestId('el-standard').locator('button')).toHaveCount(3);
  });

  /**
   * Records the three item widths of the element's standard group once per 16ms frame, pressing
   * (pointerdown) and releasing (pointerup) the middle item at the given frames.
   */
  async function trace(page: Page, frames: number, events: [frame: number, type: string][]) {
    await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 10_000);
    await page.evaluate(
      ([n, schedule]) => {
        const group = document.querySelector('[data-testid="el-standard"] .m3e-button-group')!;
        const buttons = [...group.querySelectorAll<HTMLElement>('.m3e-button-group__item')];
        const play = buttons[1]!;
        const fire = (type: string) => {
          const r = play.getBoundingClientRect();
          play.dispatchEvent(
            new PointerEvent(type, {
              bubbles: true,
              button: 0,
              pointerId: 1,
              pointerType: 'mouse',
              clientX: r.x + r.width / 2,
              clientY: r.y + r.height / 2,
            }),
          );
        };
        const out: number[][] = [];
        (window as unknown as { bgTrace: number[][] }).bgTrace = out;
        const frame = () => {
          out.push(buttons.map((b) => b.getBoundingClientRect().width));
          for (const [at, type] of schedule) if (out.length === at) fire(type);
          if (out.length < n) requestAnimationFrame(frame);
        };
        for (const [at, type] of schedule) if (at === 0) fire(type);
        // After the press has been observed and the spring asked for its frame.
        queueMicrotask(() => requestAnimationFrame(frame));
      },
      [frames, events] as const,
    );
    await page.clock.runFor(16 * frames + 200);
    return page.evaluate(() => (window as unknown as { bgTrace: number[][] }).bgTrace);
  }

  test('press expands on the fast spatial spring (overshoot), total width constant', async ({
    page,
  }) => {
    const rest = await widths(page.getByTestId('el-standard'));
    const frames = await trace(page, 60, [
      [0, 'pointerdown'],
      [40, 'pointerup'],
    ]);
    const play = frames.map((f) => f[1]!);
    // A spring passes through many widths; the expressive fast spatial spring (ζ 0.6) overshoots.
    expect(new Set(play.slice(0, 15).map((w) => Math.round(w * 10))).size).toBeGreaterThanOrEqual(
      5,
    );
    const settled = play[38]!;
    expect(Math.max(...play.slice(0, 40))).toBeGreaterThan(settled + 0.2);
    expect(settled).toBeGreaterThan(rest[1]!);
    for (const f of frames) expect(sum(f)).toBeCloseTo(sum(rest), 1);
    expect(play.at(-1)!).toBeCloseTo(rest[1]!, 0);
  });

  test('a quick tap keeps expanding until 75 % before it springs back (EnlargeOnPressNode)', async ({
    page,
  }) => {
    const rest = await widths(page.getByTestId('el-standard'));
    const frames = await trace(page, 50, [
      [0, 'pointerdown'],
      [1, 'pointerup'],
    ]);
    const play = frames.map((f) => f[1]!);
    // Released after one frame, still growing for the next ones.
    expect(play[2]!).toBeGreaterThan(play[1]!);
    expect(play[3]!).toBeGreaterThan(play[2]!);
    expect(play.at(-1)!).toBeCloseTo(rest[1]!, 0);
  });

  test('the width spring is interruptible and keeps its velocity (trace)', async ({ page }) => {
    const rest = await widths(page.getByTestId('el-standard'));
    // Expand, release, then press again mid-flight while it shrinks.
    const frames = await trace(page, 90, [
      [0, 'pointerdown'],
      [30, 'pointerup'],
      [36, 'pointerdown'],
      [60, 'pointerup'],
    ]);
    const play = frames.map((f) => f[1]!);
    const top = play[29]!;
    const range = top - rest[1]!;
    expect(range).toBeGreaterThan(2);
    // Shrinking after the release…
    expect(play[32]!).toBeLessThan(play[30]!);
    // …and the frame after the new press still moves the old way (velocity kept), then turns.
    // (The retarget frame itself holds: the new spring starts at elapsed 0, as Animatable does.)
    expect(play[37]!).toBeLessThan(play[36]!);
    const turn = play.indexOf(Math.min(...play.slice(30, 60)));
    expect(turn).toBeGreaterThan(36);
    expect(play[50]!).toBeCloseTo(top, 0);
    // No jump anywhere: a restart would snap to an endpoint.
    for (let i = 1; i < play.length; i++) {
      expect(Math.abs(play[i]! - play[i - 1]!), `frame ${String(i)}`).toBeLessThan(range * 0.6);
    }
    for (const f of frames) expect(sum(f)).toBeCloseTo(sum(rest), 1);
    expect(play.at(-1)!).toBeCloseTo(rest[1]!, 0);
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the width spring snaps (spatial duration 0)', async ({ page }) => {
    expect(await px(page, '--m3e-comp-button-group-width-spring-duration')).toBe(0);
    const group = page.getByTestId('el-standard');
    const rest = await widths(group);
    const after = await page.evaluate(async () => {
      const root = document.querySelector('[data-testid="el-standard"] .m3e-button-group')!;
      const play = root.querySelectorAll<HTMLElement>('.m3e-button-group__item')[1]!;
      play.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
      return play.getBoundingClientRect().width;
    });
    const limits = await items(group).evaluateAll((els) =>
      els.map((el) => Number.parseFloat(getComputedStyle(el).paddingInlineEnd)),
    );
    const growth = Math.min((0.15 * rest[1]!) / 2, limits[0]!, limits[2]!);
    expect(after).toBeCloseTo(rest[1]! + 2 * growth, 1);
  });
});

test('keyboard: one tab stop, arrows / Home / End move focus, mirrored in RTL', async ({
  page,
}) => {
  const group = page.getByTestId('el-standard');
  const [previous, play, next] = await items(group).all();
  await previous!.focus();
  await page.keyboard.press('ArrowRight');
  await expect(play!).toBeFocused();
  await page.keyboard.press('End');
  await expect(next!).toBeFocused();
  await page.keyboard.press('Home');
  await expect(previous!).toBeFocused();
  await page.keyboard.press('ArrowRight');
  expect(
    await items(group).evaluateAll((els) => els.map((e) => e.getAttribute('tabindex'))),
  ).toEqual(['-1', '0', '-1']);
  // Tab leaves the group in one step.
  await page.keyboard.press('Tab');
  await expect(items(page.getByTestId('el-connected')).first()).toBeFocused();
  // Space selects the focused radio (Enter too, as a button).
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Space');
  await expect(items(page.getByTestId('el-connected')).nth(1)).toHaveAttribute(
    'aria-checked',
    'true',
  );
  // RTL: ArrowLeft moves to the next item.
  const rtl = items(page.getByTestId('rtl'));
  await rtl.first().focus();
  await page.keyboard.press('ArrowLeft');
  await expect(rtl.nth(1)).toBeFocused();
  // React group: same layout code.
  const react = items(page.getByTestId('react-standard'));
  await react.first().focus();
  await page.keyboard.press('ArrowRight');
  await expect(react.nth(1)).toBeFocused();
});

test('selection: single radios (selection required), multiple aria-pressed, React', async ({
  page,
}) => {
  const connected = items(page.getByTestId('el-connected'));
  await expect(page.getByTestId('el-connected').locator('.m3e-button-group')).toHaveAttribute(
    'role',
    'radiogroup',
  );
  await connected.first().click();
  await expect(connected.first()).toHaveAttribute('aria-checked', 'true');
  const multiple = items(page.getByTestId('el-multiple'));
  await multiple.nth(1).click();
  await expect(multiple.nth(1)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#el-log')).toHaveText('change: bold, italic');
  const react = items(page.getByTestId('react-connected'));
  await react.nth(2).click();
  await expect(react.nth(2)).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByTestId('react-view')).toHaveText('month');
});

test('overflow: items that do not fit move to the menu; resizing brings them back', async ({
  page,
}) => {
  for (const [id, log] of [
    ['el-overflow', page.locator('#el-log')],
    ['react-overflow', page.getByTestId('react-log')],
  ] as const) {
    const container = page.getByTestId(`${id}-box`);
    const trigger = container.locator('.m3e-button-group__overflow');
    // 440px is narrower than the five buttons.
    await expect(trigger).toBeVisible();
    await expect(trigger).toHaveAccessibleName('More options');
    await expect(trigger).toHaveAttribute('aria-haspopup', 'true');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    const hidden = await items(container).evaluateAll((els) =>
      els.filter((e) => (e as HTMLElement).hidden).map((e) => e.textContent),
    );
    expect(hidden.length, id).toBeGreaterThan(0);
    // The indicator sits after the last visible item, inside the container.
    const t = await box(trigger);
    const c = await box(container);
    expect(t.x + t.width).toBeLessThanOrEqual(c.x + c.width + 0.5);
    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const menu = page.locator('.m3e-menu:popover-open');
    await expect(menu).toHaveClass(/m3e-menu--baseline/);
    await expect(menu.getByRole('menuitem')).toHaveCount(hidden.length);
    await menu.getByRole('menuitem').last().click();
    await expect(log).toHaveText(id === 'el-overflow' ? 'action: delete' : 'delete');
    await expect(page.locator('.m3e-menu:popover-open')).toHaveCount(0);
    await container.evaluate((el) => {
      (el as HTMLElement).style.inlineSize = '900px';
    });
    await expect(trigger).toBeHidden();
    await expect(items(container).filter({ visible: true })).toHaveCount(5);
    await container.evaluate((el) => {
      (el as HTMLElement).style.inlineSize = '200px';
    });
    await expect(trigger).toBeVisible();
    await expect(items(container).filter({ visible: true })).toHaveCount(1);
  }
});

test('touch targets ≥ 48dp on XS buttons', async ({ page }) => {
  const [first] = await items(page.getByTestId('standard-xs')).all();
  const b = await box(first!);
  const min = await px(page, '--m3e-comp-minimum-interactive-component-size');
  const top = b.y + b.height / 2 - min / 2 + 1;
  const hit = await page.evaluate(
    ([x, y]) => document.elementFromPoint(x, y)?.closest('.m3e-button') !== null,
    [b.x + b.width / 2, top] as const,
  );
  expect(hit).toBe(true);
});

test.describe('forced colors', () => {
  test.use({ forcedColors: 'active' });

  test('connected buttons keep visible boundaries', async ({ page }) => {
    const [first] = await items(page.getByTestId('connected-round-s')).all();
    const style = await first!.evaluate((el) => getComputedStyle(el).borderTopStyle);
    expect(style).toBe('solid');
  });
});
