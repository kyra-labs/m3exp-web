import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';

// Split button (COMPONENT_SPEC §4): acceptance criteria + light/dark × 3 browsers baselines
// (closed and open), axe, and the interruptible corner / icon springs (ROADMAP M5 DoD).
const SIZES = {
  xs: 'x-small',
  s: 'small',
  m: 'medium',
  l: 'large',
  xl: 'x-large',
} as const;
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

const token = (page: Page, name: string) =>
  page.evaluate(
    (n) => Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue(n)),
    name,
  );
const box = async (el: Locator) => (await el.boundingBox())!;
/** Physical corner radii: top-left, top-right, bottom-right, bottom-left. */
const radii = (el: Locator) =>
  el.evaluate((node) => {
    const s = getComputedStyle(node);
    return [
      s.borderTopLeftRadius,
      s.borderTopRightRadius,
      s.borderBottomRightRadius,
      s.borderBottomLeftRadius,
    ].map((v) => Number.parseFloat(v));
  });
const rotation = (el: Locator) =>
  el.evaluate((node) => Number.parseFloat(getComputedStyle(node).rotate) || 0);
const split = (root: Locator) => ({
  leading: root.locator('.m3e-split-button__leading'),
  trailing: root.locator('.m3e-split-button__trailing'),
  icon: root.locator('.m3e-split-button__trailing > .m3e-icon'),
});
const element = (page: Page, testId: string) =>
  split(page.getByTestId(testId).locator('.m3e-split-button'));
/** The open `.m3e-menu` of an element split button (rendered by its <m3e-menu> child). */
const elementMenu = (page: Page, testId: string) => page.getByTestId(testId).locator('.m3e-menu');
/** Waits until the menu's open springs and the trailing icon have settled. */
const settled = async (menu: Locator, icon: Locator) => {
  await expect(menu).toBeVisible();
  await expect
    .poll(() =>
      menu.evaluate((el) =>
        ['--_m3e-menu-scale', '--_m3e-menu-opacity'].map((n) => el.style.getPropertyValue(n)),
      ),
    )
    .toEqual(['1', '1']);
  await expect.poll(() => rotation(icon)).toBe(180);
};

test.beforeEach(async ({ page }) => {
  await page.goto('/components/split-button/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByTestId('react-split').locator('.m3e-split-button')).toHaveCount(2);
});

test('has no axe violations', async ({ page }) => {
  // Disabled buttons are exempt from contrast (WCAG 1.4.3 "incidental"); scanned without that rule.
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).exclude(':disabled').analyze();
  expect(results.violations).toEqual([]);
  const disabled = await new AxeBuilder({ page })
    .withTags(AXE_TAGS)
    .include(':disabled')
    .disableRules(['color-contrast'])
    .analyze();
  expect(disabled.violations).toEqual([]);
});

test('has no axe violations with menus open (element, React)', async ({ page }) => {
  const scan = async () => {
    const results = await new AxeBuilder({ page })
      .withTags(AXE_TAGS)
      .exclude(':disabled')
      .analyze();
    expect(results.violations).toEqual([]);
  };
  const el = element(page, 'el-split');
  await el.trailing.click();
  await settled(elementMenu(page, 'el-split'), el.icon);
  await scan();
  await page.keyboard.press('Escape');
  const react = split(page.getByTestId('react-split-filled'));
  await react.trailing.click();
  await expect(react.trailing).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('menuitem', { name: 'Share link' }).last()).toBeVisible();
  await scan();
});

test('variants and states match the visual baseline', async ({ page }) => {
  await expect(page.getByTestId('variants')).toHaveScreenshot('split-button-variants.png');
});

test('sizes (closed and open) match the visual baseline', async ({ page }) => {
  await expect(page.getByTestId('sizes')).toHaveScreenshot('split-button-sizes.png');
});

test('an open element split button matches the visual baseline', async ({ page }) => {
  const el = element(page, 'el-split');
  await el.trailing.click();
  const menu = elementMenu(page, 'el-split');
  await settled(menu, el.icon);
  await page.mouse.move(0, 0);
  const root = await box(page.getByTestId('el-split').locator('.m3e-split-button'));
  const m = await box(menu);
  const pad = 16;
  const x = Math.min(root.x, m.x) - pad;
  const y = Math.min(root.y, m.y) - pad;
  await expect(page).toHaveScreenshot('split-button-open.png', {
    clip: {
      x,
      y,
      width: Math.max(root.x + root.width, m.x + m.width) + pad - x,
      height: Math.max(root.y + root.height, m.y + m.height) + pad - y,
    },
    timeout: 15_000,
  });
});

test('keyboard focus ring on the trailing button matches the visual baseline', async ({ page }) => {
  const el = element(page, 'el-tonal');
  await el.leading.focus();
  await page.keyboard.press('Tab');
  await expect(el.trailing).toBeFocused();
  const b = await box(page.getByTestId('el-tonal').locator('.m3e-split-button'));
  await expect(page).toHaveScreenshot('split-button-focused.png', {
    clip: { x: b.x - 8, y: b.y - 8, width: b.width + 16, height: b.height + 16 },
  });
});

test('sizes, paddings and icons match SplitButton*Tokens (±0.5px)', async ({ page }) => {
  const spacing = await token(page, '--m3e-comp-split-button-spacing');
  expect(spacing).toBe(2);
  for (const [size, name] of Object.entries(SIZES)) {
    const t = (field: string) => token(page, `--m3e-comp-split-button-${name}-${field}`);
    const root = page.locator(
      `[data-testid="sizes"] [data-expanded="false"] [data-size="${size}"]`,
    );
    const { leading, trailing, icon } = split(root);
    const l = await box(leading);
    const r = await box(trailing);
    const height = await t('container-height');
    expect(Math.abs(l.height - height), `${size} leading height`).toBeLessThanOrEqual(0.5);
    expect(Math.abs(r.height - height), `${size} trailing height`).toBeLessThanOrEqual(0.5);
    // SplitButtonLayout spacing (SplitButtonDefaults.Spacing) at every size.
    expect(r.x - (l.x + l.width), `${size} spacing`).toBeCloseTo(spacing, 1);
    // Trailing width = leading space + icon + trailing space, at least 48dp.
    const iconSize = await t('trailing-icon-size');
    expect((await box(icon)).width, `${size} icon`).toBeCloseTo(iconSize, 1);
    const expectedWidth = Math.max(
      48,
      (await t('trailing-button-leading-space')) +
        iconSize +
        (await t('trailing-button-trailing-space')),
    );
    expect(Math.abs(r.width - expectedWidth), `${size} trailing width`).toBeLessThanOrEqual(0.5);
    // Leading paddings: start before the icon, end after the label.
    const leadingIcon = await box(leading.locator('.m3e-icon'));
    expect(leadingIcon.x - l.x, `${size} leading start`).toBeCloseTo(
      await t('leading-button-leading-space'),
      0,
    );
    expect(
      await leading.evaluate((el) => Number.parseFloat(getComputedStyle(el).paddingInlineEnd)),
      `${size} leading end`,
    ).toBe(await t('leading-button-trailing-space'));
  }
});

test('shapes: full outer corners, inner corners per size, pressed and open (full)', async ({
  page,
}) => {
  for (const [size, name] of Object.entries(SIZES)) {
    const inner = await token(page, `--m3e-comp-split-button-${name}-inner-corner-corner-size`);
    const closed = split(
      page.locator(`[data-testid="sizes"] [data-expanded="false"] [data-size="${size}"]`),
    );
    const half = (await box(closed.leading)).height / 2;
    expect(await radii(closed.leading), size).toEqual([half, inner, inner, half]);
    expect(await radii(closed.trailing), size).toEqual([inner, half, half, inner]);
    // Open (checked): TrailingCheckedShape = CircleShape.
    const open = split(
      page.locator(`[data-testid="sizes"] [data-expanded="true"] [data-size="${size}"]`),
    );
    expect(await radii(open.trailing), `${size} open`).toEqual([half, half, half, half]);
    expect(await rotation(open.icon), `${size} open icon`).toBe(180);
  }
  // Pressed: InnerPressedCornerCornerSize (CSS-only buttons, :active).
  const pressed = await token(
    page,
    '--m3e-comp-split-button-medium-inner-corner-corner-size-pressed',
  );
  const medium = split(
    page.locator('[data-testid="sizes"] [data-expanded="false"] [data-size="m"]'),
  );
  const b = await box(medium.leading);
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await expect.poll(async () => (await radii(medium.leading))[1]).toBeCloseTo(pressed, 0);
  await page.mouse.up();
});

test('the trailing icon is centered optically (HorizontalCenterOptically)', async ({ page }) => {
  const coefficient = await token(page, '--m3e-comp-split-button-center-optically-coefficient');
  const root = split(
    page.locator('[data-testid="sizes"] [data-expanded="false"] [data-size="xl"]'),
  );
  const t = await box(root.trailing);
  const i = await box(root.icon);
  const inner = await token(page, '--m3e-comp-split-button-x-large-inner-corner-corner-size');
  // Toward the end by coefficient × (start corners − end corners): negative = toward the start.
  const expected = coefficient * (inner - t.height / 2);
  expect(i.x + i.width / 2 - (t.x + t.width / 2)).toBeCloseTo(expected, 0);
  // Checked: symmetric (full) corners, no offset.
  const open = split(page.locator('[data-testid="sizes"] [data-expanded="true"] [data-size="xl"]'));
  const ot = await box(open.trailing);
  const oi = await box(open.icon);
  expect(oi.x + oi.width / 2 - (ot.x + ot.width / 2)).toBeCloseTo(0, 0);
});

test('XS buttons keep a ≥ 48dp tall hit area', async ({ page }) => {
  const root = split(
    page.locator('[data-testid="sizes"] [data-expanded="false"] [data-size="xs"]'),
  );
  for (const [part, el] of [
    ['leading', root.leading],
    ['trailing', root.trailing],
  ] as const) {
    const b = await box(el);
    expect(b.width, part).toBeGreaterThanOrEqual(48);
    const reach = (48 - b.height) / 2;
    for (const y of [b.y - reach + 1, b.y + b.height + reach - 1]) {
      const hit = await page.evaluate(
        ([px, py]) => document.elementFromPoint(px, py)?.closest('button')?.className ?? '',
        [b.x + b.width / 2, y] as const,
      );
      expect(hit, `${part} at y=${String(y)}`).toContain(`m3e-split-button__${part}`);
    }
  }
});

test('element: aria-expanded syncs, the icon turns, Escape returns focus (APG menu button)', async ({
  page,
}) => {
  const el = element(page, 'el-split');
  const menu = elementMenu(page, 'el-split');
  await expect(el.trailing).toHaveAttribute('aria-haspopup', 'true');
  await expect(el.trailing).toHaveAttribute('aria-expanded', 'false');
  await expect(el.trailing).toHaveAccessibleName('More send options');
  await el.trailing.click();
  await settled(menu, el.icon);
  await expect(el.trailing).toHaveAttribute('aria-expanded', 'true');
  const half = (await box(el.trailing)).height / 2;
  await expect.poll(() => radii(el.trailing)).toEqual([half, half, half, half]);
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(el.trailing).toBeFocused();
  await expect(el.trailing).toHaveAttribute('aria-expanded', 'false');
  await expect.poll(() => rotation(el.icon)).toBe(0);
  // Keyboard: ArrowDown opens on the first item; Enter runs it and closes.
  await page.keyboard.press('ArrowDown');
  await expect(menu.getByRole('menuitem', { name: 'Send a copy' })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(menu).toBeHidden();
  await expect(el.trailing).toBeFocused();
  await expect(page.locator('#el-split-log')).toHaveText('action: share');
  // The leading button runs the primary action.
  await page.keyboard.press('Shift+Tab');
  await expect(el.leading).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#el-split-log')).toHaveText('press: Send');
});

test('React: aria-expanded syncs, Escape returns focus, onPress and onOpenChange', async ({
  page,
}) => {
  const filled = split(page.getByTestId('react-split-filled'));
  await expect(filled.trailing).toHaveAccessibleName('More send options (React)');
  await filled.trailing.focus();
  await page.keyboard.press('ArrowDown');
  await expect(filled.trailing).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('menuitem', { name: 'Send a copy' })).toBeFocused();
  await expect.poll(() => rotation(filled.icon)).toBe(180);
  await page.keyboard.press('Escape');
  await expect(filled.trailing).toBeFocused();
  await expect(filled.trailing).toHaveAttribute('aria-expanded', 'false');
  await expect.poll(() => rotation(filled.icon)).toBe(0);
  await filled.leading.click();
  await expect(page.getByTestId('react-split-log')).toHaveText('send');
  // Controlled: isOpen / onOpenChange.
  const controlled = split(page.getByTestId('react-split-controlled'));
  await controlled.trailing.click();
  await expect(page.getByTestId('react-split')).toContainText('menu open');
  await expect(controlled.trailing).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('menuitem', { name: 'Paste' }).click();
  await expect(page.getByTestId('react-split-log')).toHaveText('paste');
  await expect(page.getByTestId('react-split')).toContainText('menu closed');
});

test('RTL: the trailing button is at the inline start side of the leading one, logical corners', async ({
  page,
}) => {
  const el = element(page, 'el-rtl');
  const l = await box(el.leading);
  const t = await box(el.trailing);
  expect(t.x + t.width).toBeLessThan(l.x);
  const half = l.height / 2;
  const inner = await token(page, '--m3e-comp-split-button-small-inner-corner-corner-size');
  // Leading: full corners at its (right) start, inner at its (left) end.
  expect(await radii(el.leading)).toEqual([inner, half, half, inner]);
  expect(await radii(el.trailing)).toEqual([half, inner, inner, half]);
  // Optical offset toward the start (right in RTL).
  const i = await box(el.icon);
  expect(i.x + i.width / 2).toBeGreaterThan(t.x + t.width / 2);
});

test.describe('springs (frames driven by the Playwright clock)', () => {
  // Fake timers make the traces deterministic: every requestAnimationFrame and performance.now()
  // the springs see comes from page.clock, so a loaded CI machine cannot drop frames.
  test.beforeEach(async ({ page }) => {
    await page.clock.install();
    await page.reload();
    await expect(page.getByTestId('react-split').locator('.m3e-split-button')).toHaveCount(2);
  });

  /**
   * Toggles a split button's menu and records every frame the springs write: the trailing
   * button's inner corner (computed border-start-start-radius) and its icon's rotation, observed
   * on the icon's style writes (not sampled by a second frame loop, whose order relative to the
   * springs' loop would vary). With `reverseAbove`, toggles again from the first write whose
   * rotation exceeds it (mid-flight) and returns that write's index.
   */
  async function trace(page: Page, selector: string, ms: number, reverseAbove?: number) {
    await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 10_000);
    await page.evaluate(
      ([sel, reverse]) => {
        const trailing = document.querySelector<HTMLElement>(`${sel} .m3e-split-button__trailing`)!;
        const icon = trailing.querySelector<HTMLElement>('.m3e-icon')!;
        const state = { writes: [] as [number, number][], reversedAt: -1 };
        (window as unknown as { splitTrace: typeof state }).splitTrace = state;
        new MutationObserver(() => {
          const write: [number, number] = [
            Number.parseFloat(getComputedStyle(trailing).borderStartStartRadius),
            Number.parseFloat(getComputedStyle(icon).rotate) || 0,
          ];
          const previous = state.writes.at(-1);
          // A retarget first re-writes the current value; keep one entry per value.
          if (previous?.[0] === write[0] && previous[1] === write[1]) return;
          state.writes.push(write);
          if (reverse !== null && state.reversedAt < 0 && write[1] > reverse) {
            state.reversedAt = state.writes.length - 1;
            trailing.click();
          }
        }).observe(icon, { attributes: true, attributeFilter: ['style'] });
        trailing.click();
      },
      [selector, reverseAbove ?? null] as const,
    );
    await page.clock.runFor(ms);
    return page.evaluate(
      () =>
        (window as unknown as { splitTrace: { writes: [number, number][]; reversedAt: number } })
          .splitTrace,
    );
  }

  for (const [layer, selector] of [
    ['element', '[data-testid="el-split"]'],
    ['React', '[data-testid="react-split-filled"]'],
  ] as const) {
    test(`${layer}: opening springs the inner corners to full and turns the icon 180°`, async ({
      page,
    }) => {
      const trailing = page.locator(`${selector} .m3e-split-button__trailing`);
      const half = (await box(trailing)).height / 2;
      const inner = await token(page, '--m3e-comp-split-button-small-inner-corner-corner-size');
      const { writes } = await trace(page, selector, 1000);
      const corners = writes.map(([c]) => c);
      const angles = writes.map(([, a]) => a);
      await expect(trailing).toHaveAttribute('aria-expanded', 'true');
      // A spring passes through intermediate values on many frames; a jump would not.
      expect(corners.some((c) => c > inner + 0.5 && c < half - 0.5)).toBe(true);
      expect(angles.filter((a) => a > 5 && a < 175).length).toBeGreaterThanOrEqual(5);
      expect(corners.at(-1)!).toBeCloseTo(half, 1);
      expect(angles.at(-1)!).toBeCloseTo(180, 1);
      // Critically damped (spring() ζ 1; default effects ζ 1): no overshoot, always forward.
      expect(Math.max(...angles)).toBeLessThanOrEqual(180.01);
      for (let i = 1; i < angles.length; i++) {
        expect(angles[i]!, `frame ${String(i)}`).toBeGreaterThanOrEqual(angles[i - 1]!);
      }
      // Settled: the inline spring values are gone, m3e-css holds the open state.
      expect(
        await trailing.evaluate((el) => el.style.getPropertyValue('--_m3e-split-button-inner-now')),
      ).toBe('');
    });

    test(`${layer}: the springs are interruptible and keep their velocity (trace)`, async ({
      page,
    }) => {
      // Open, then close again early in the flight, while both springs move fast. (Both are
      // critically damped: once most of the way, the pull of the new target outweighs the carried
      // velocity within a frame, so the reversal has to come early to show it.)
      const { writes, reversedAt: r } = await trace(page, selector, 1000, 15);
      const angles = writes.map(([, a]) => a);
      const corners = writes.map(([c]) => c);
      expect(r, 'reversed').toBeGreaterThanOrEqual(0);
      expect(angles[r]!, 'reversed mid-flight').toBeLessThan(175);
      // Velocity kept: the frame after the reversal still turns forward, then the icon turns back.
      // A spring restarted from rest would turn back at once.
      expect(angles[r + 1]!, 'continues in the old direction').toBeGreaterThan(angles[r]!);
      expect(corners[r + 1]!, 'the corner continues too').toBeGreaterThan(corners[r]!);
      expect(angles.indexOf(Math.max(...angles))).toBeGreaterThan(r);
      expect(angles.at(-1)!).toBeCloseTo(0, 1);
      // No jump anywhere: a restart would snap to an endpoint.
      for (let i = 1; i < angles.length; i++) {
        expect(Math.abs(angles[i]! - angles[i - 1]!), `frame ${String(i)}`).toBeLessThan(60);
      }
      await expect(page.locator(`${selector} .m3e-split-button__trailing`)).toHaveAttribute(
        'aria-expanded',
        'false',
      );
    });
  }
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the icon rotation (spatial) jumps: duration 0', async ({ page }) => {
    expect(await token(page, '--m3e-comp-split-button-trailing-icon-rotation-duration')).toBe(0);
    const angle = await page.evaluate(async () => {
      const trailing = document.querySelector<HTMLElement>(
        '[data-testid="el-split"] .m3e-split-button__trailing',
      )!;
      trailing.click();
      for (let i = 0; i < 4; i++) await Promise.resolve();
      return Number.parseFloat(getComputedStyle(trailing.querySelector('.m3e-icon')!).rotate);
    });
    expect(angle).toBe(180);
  });
});

test.describe('forced colors', () => {
  test.use({ forcedColors: 'active' });

  test('both buttons keep a visible boundary; the open trailing button is highlighted', async ({
    page,
  }) => {
    const root = split(
      page.locator('[data-testid="sizes"] [data-expanded="false"] [data-size="m"]'),
    );
    for (const el of [root.leading, root.trailing]) {
      expect(await el.evaluate((n) => getComputedStyle(n).borderTopStyle)).toBe('solid');
    }
    const open = split(
      page.locator('[data-testid="sizes"] [data-expanded="true"] [data-size="m"]'),
    );
    const color = await open.trailing.evaluate((n) => getComputedStyle(n).borderTopColor);
    const highlight = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.color = 'Highlight';
      document.body.append(probe);
      const value = getComputedStyle(probe).color;
      probe.remove();
      return value;
    });
    expect(color).toBe(highlight);
  });
});
