import AxeBuilder from '@axe-core/playwright';
import { springValue } from '@kyralabs/m3e-motion';
import { type Locator, type Page, expect, test } from '@playwright/test';

// Segmented button (COMPONENT_SPEC §37, @deprecated D4): static m3e-css rows (Compose's
// single-select and multi-select samples, the check alone, disabled rows, one button, RTL) and
// React. Acceptance + light/dark × 3 browsers baselines, axe, geometry from SegmentedButton.kt,
// colors, the check and label motion (CSS transitions frozen at chosen times and compared with
// the Compose springs), keyboard (native radios / checkboxes, owner decision M9 #29), forced
// colors, reduced motion and the deprecation banner.
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
const box = async (el: Locator) => (await el.boundingBox())!;
const token = (page: Page, name: string) =>
  page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
const num = async (page: Page, name: string) => Number(await token(page, name));
const button = (page: Page, row: string, i: number) =>
  page.getByTestId(`static-${row}-${String(i)}`);
const input = (page: Page, row: string, i: number) => button(page, row, i).locator('input');

/** The label's offset (px), and the check's opacity and scale. */
const parts = (label: Locator) =>
  label.evaluate((root) => {
    const text = getComputedStyle(root.querySelector('.m3e-segmented-button__label')!);
    const check = getComputedStyle(root.querySelector('.m3e-segmented-button__check')!);
    return {
      offset: Number.parseFloat(text.insetInlineStart),
      opacity: Number(check.opacity),
      scale: check.scale === 'none' ? 1 : Number(check.scale),
    };
  });

/** Pauses every transition under `root` at `ms`. */
const freeze = (root: Locator, ms: number) =>
  root.evaluate((node, t) => {
    for (const a of node.getAnimations({ subtree: true })) {
      a.pause();
      a.currentTime = t;
    }
  }, ms);

/**
 * Clicks `selector` and, in the same task, pauses (or seeks to `ms`) the transitions the change
 * started under `root`, so a slow runner cannot miss them.
 */
const clickAndPause = (root: Locator, selector: string, ms?: number) =>
  root.evaluate(
    (node, [sel, t]) => {
      document.querySelector<HTMLElement>(sel)!.click();
      for (const el of node.querySelectorAll(
        '.m3e-segmented-button__label, .m3e-segmented-button__icon > *',
      )) {
        getComputedStyle(el).getPropertyValue('opacity');
      }
      for (const a of node.getAnimations({ subtree: true })) {
        a.pause();
        if (t !== undefined) a.currentTime = t;
      }
    },
    [selector, ms] as const,
  );

test.beforeEach(async ({ page }) => {
  await page.goto('/components/segmented-button/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByTestId('react-segmented').locator('.m3e-segmented-button')).toHaveCount(6);
});

test('has no axe violations', async ({ page }) => {
  const results = await new AxeBuilder({ page })
    .withTags(AXE_TAGS)
    .exclude('[data-testid="static-disabled"]')
    .exclude('[data-testid="static-partly-1"]')
    .analyze();
  expect(results.violations).toEqual([]);
  // WCAG 1.4.3 exempts inactive components: the disabled buttons skip only the contrast rule.
  const disabled = await new AxeBuilder({ page })
    .include('[data-testid="static-disabled"]')
    .include('[data-testid="static-partly-1"]')
    .withTags(AXE_TAGS)
    .disableRules(['color-contrast'])
    .analyze();
  expect(disabled.violations).toEqual([]);
});

test('matches the visual baseline', async ({ page }) => {
  await expect(page).toHaveScreenshot('segmented-button.png', { fullPage: true });
});

test('deprecated (D4): the docs banner names the connected button group', async ({ page }) => {
  const banner = page.locator('[data-deprecated] .docs-deprecated');
  await expect(banner).toContainText('D4');
  await expect(banner).toContainText('connected button group');
});

test('rows: equal widths from the widest button, 1dp overlap, 48dp high with 40dp buttons', async ({
  page,
}) => {
  for (const row of ['single', 'multi', 'check', 'partly', 'rtl']) {
    const r = await box(page.getByTestId(`static-${row}`));
    const buttons = page.getByTestId(`static-${row}`).locator('.m3e-segmented-button');
    const n = await buttons.count();
    const boxes = await Promise.all([...Array(n).keys()].map((i) => box(buttons.nth(i))));
    expect(r.height, row).toBe(48);
    for (const b of boxes) {
      expect(b.width, row).toBeCloseTo(boxes[0]!.width, 1);
      expect(b.height, row).toBe(40);
      expect(b.y - r.y, row).toBe(4);
      expect(b.width, row).toBeGreaterThanOrEqual(58);
    }
    // spacedBy(−BorderWidth): n buttons overlapping by 1dp.
    expect(r.width, row).toBeCloseTo(n * boxes[0]!.width - (n - 1), 1);
    const ordered = [...boxes].sort((a, b) => a.x - b.x);
    for (let i = 1; i < n; i++) {
      expect(ordered[i]!.x - (ordered[i - 1]!.x + ordered[i - 1]!.width), row).toBeCloseTo(-1, 1);
    }
  }
  // The native input covers the 48dp target.
  const target = await box(input(page, 'single', 1));
  expect(target.height).toBe(48);
  expect(target.width).toBeCloseTo((await box(button(page, 'single', 1))).width, 1);
  // One button alone: the base shape on every corner (itemShape count == 1).
  const one = await button(page, 'one', 0).evaluate((el) => {
    const s = getComputedStyle(el);
    return [
      s.borderStartStartRadius,
      s.borderEndStartRadius,
      s.borderStartEndRadius,
      s.borderEndEndRadius,
    ];
  });
  for (const r of one) expect(Number.parseFloat(r)).toBeGreaterThanOrEqual(20);
});

test('item shapes: full start corners on the first, none in the middle, full end corners on the last', async ({
  page,
}) => {
  const corners = (i: number) =>
    button(page, 'single', i).evaluate((el) => {
      const s = getComputedStyle(el);
      return [
        s.borderStartStartRadius,
        s.borderEndStartRadius,
        s.borderStartEndRadius,
        s.borderEndEndRadius,
      ].map((v) => Number.parseFloat(v) > 0);
    });
  expect(await corners(0)).toEqual([true, true, false, false]);
  expect(await corners(1)).toEqual([false, false, false, false]);
  expect(await corners(2)).toEqual([false, false, true, true]);
});

test('content: 12dp padding, the 18dp icon slot, 8dp spacing; the label drawn 13dp back without an icon', async ({
  page,
}) => {
  const layout = (row: string, i: number) =>
    button(page, row, i).evaluate((el) => {
      const b = el.getBoundingClientRect();
      const icon = el.querySelector('.m3e-segmented-button__icon')!.getBoundingClientRect();
      const label = el.querySelector('.m3e-segmented-button__label')!.getBoundingClientRect();
      return {
        icon: icon.width,
        iconToLabel: label.left - icon.right,
        // The content (icon slot + spacing + label) is centered in the button.
        center: (icon.left + label.right) / 2,
        mid: (b.left + b.right) / 2,
        start: icon.left - b.left,
      };
    });
  const selected = await layout('single', 0);
  expect(selected.icon).toBe(18);
  expect(selected.iconToLabel).toBeCloseTo(8, 1);
  expect(selected.center).toBeCloseTo(selected.mid, 0);
  const unselected = await layout('single', 1);
  // −(IconSize + IconSpacing) / 2 = −13dp: the label starts 5dp before the icon slot ends.
  expect(unselected.iconToLabel).toBeCloseTo(8 - 13, 1);
  // "Month" is the widest label: its content sits at the 12dp padding.
  expect(unselected.start).toBeCloseTo(12, 1);
  // With an unselected icon, the label stays after the slot.
  expect((await layout('multi', 0)).iconToLabel).toBeCloseTo(8, 1);
  expect(await parts(button(page, 'single', 1))).toEqual({ offset: -13, opacity: 0, scale: 0 });
  expect(await parts(button(page, 'single', 0))).toEqual({ offset: 0, opacity: 1, scale: 1 });
});

test('colors: secondary container selected, outline border; disabled at 38% / 12%; the selected container stays', async ({
  page,
}) => {
  const colors = (row: string, i: number) =>
    button(page, row, i).evaluate((el) => {
      const s = getComputedStyle(el);
      return {
        container: s.backgroundColor,
        content: s.color,
        outline: s.boxShadow,
        layer: getComputedStyle(el, '::before').backgroundColor,
      };
    });
  const resolve = (value: string) =>
    page.evaluate((v) => {
      const probe = document.createElement('div');
      probe.style.color = v;
      document.body.append(probe);
      const c = getComputedStyle(probe).color;
      probe.remove();
      return c;
    }, value);
  const on = await colors('single', 0);
  const off = await colors('single', 1);
  expect(on.container).toBe(await resolve('var(--m3e-sys-color-secondary-container)'));
  expect(on.content).toBe(await resolve('var(--m3e-sys-color-on-secondary-container)'));
  expect(off.container).toBe('rgba(0, 0, 0, 0)');
  expect(off.content).toBe(await resolve('var(--m3e-sys-color-on-surface)'));
  const outline = await resolve('var(--m3e-sys-color-outline)');
  expect(on.outline).toContain(outline);
  expect(off.outline).toContain(outline);
  expect(on.outline).toContain('inset');
  // The state layer is the content color, selected or not.
  expect(on.layer).toBe(on.content);
  expect(off.layer).toBe(off.content);
  // Disabled: Outline at 12% (not the token file's on-surface), content on-surface at 38%; the
  // selected container stays opaque.
  const disabledOn = await colors('disabled', 1);
  const disabledOff = await colors('disabled', 0);
  expect(disabledOn.container).toBe(on.container);
  expect(disabledOff.container).toBe('rgba(0, 0, 0, 0)');
  expect(disabledOff.outline).toContain(
    await resolve('color-mix(in srgb, var(--m3e-sys-color-outline) 12%, transparent)'),
  );
  expect(disabledOff.content).toBe(
    await resolve('color-mix(in srgb, var(--m3e-sys-color-on-surface) 38%, transparent)'),
  );
  // Hover changes no color (state layer only).
  await button(page, 'single', 1).hover();
  expect((await colors('single', 1)).content).toBe(off.content);
});

test('z-index: the selected button is raised by 5, focus and presses by one more', async ({
  page,
}) => {
  const z = (i: number) =>
    button(page, 'single', i).evaluate((el) => Number(getComputedStyle(el).zIndex));
  expect(await z(0)).toBe(5);
  expect(await z(1)).toBe(0);
  await input(page, 'single', 0).focus();
  expect(await z(0)).toBe(6);
  await input(page, 'single', 2).focus();
  expect(await z(2)).toBe(1);
});

test('selecting: the check fades and scales in, the label slides on fast spatial; the old check goes at once', async ({
  page,
}) => {
  const row = page.getByTestId('static-single');
  const spec = {
    dampingRatio: await num(page, '--m3e-sys-motion-spring-fast-spatial-damping-ratio'),
    stiffness: await num(page, '--m3e-sys-motion-spring-fast-spatial-stiffness'),
  };
  await clickAndPause(row, '[data-testid="static-single-2"] input');
  await expect(input(page, 'single', 2)).toBeChecked();
  let peak = -13;
  for (const t of [16, 48, 96, 160, 240]) {
    await freeze(row, t);
    const selected = await parts(button(page, 'single', 2));
    const old = await parts(button(page, 'single', 0));
    // The CSS spring is a sampled linear() easing of the same spring (Compose SpringSimulation).
    expect(selected.offset, `selected t = ${String(t)}ms`).toBeCloseTo(
      springValue(spec, t, -13, 0),
      0,
    );
    expect(selected.scale, `scale t = ${String(t)}ms`).toBeCloseTo(springValue(spec, t, 0, 1), 1);
    expect(old.offset, `old t = ${String(t)}ms`).toBeCloseTo(springValue(spec, t, 0, -13), 0);
    // ExitTransition.None: the old check is gone at once.
    expect(old.opacity).toBe(0);
    peak = Math.max(peak, selected.offset);
  }
  // FastSpatial under the expressive scheme (ζ 0.6) overshoots: the label passes 0.
  expect(peak).toBeGreaterThan(0.2);
  // The fade is on default effects.
  const fade = await button(page, 'single', 2)
    .locator('.m3e-segmented-button__check')
    .evaluate((el) => getComputedStyle(el).transitionDuration.split(', '));
  const effects = await token(page, '--m3e-sys-motion-spring-default-effects-duration');
  const seconds = (t: string) => Number.parseFloat(t) / (t.endsWith('ms') ? 1000 : 1);
  expect(seconds(fade[0]!)).toBeCloseTo(seconds(effects), 3);
});

test('an unselected icon cross-fades with the check (default effects), both ways', async ({
  page,
}) => {
  const row = page.getByTestId('static-multi');
  const icons = (i: number) =>
    button(page, 'multi', i).evaluate((el) =>
      [...el.querySelectorAll('.m3e-segmented-button__icon > .m3e-icon')].map((ic) => {
        const s = getComputedStyle(ic);
        return { opacity: Number(s.opacity), scale: s.scale };
      }),
    );
  // Crossfade only fades: no scale on either icon.
  expect(await icons(0)).toEqual([
    { opacity: 0, scale: '1' },
    { opacity: 1, scale: '1' },
  ]);
  await clickAndPause(row, '[data-testid="static-multi-0"] input', 40);
  const mid = await icons(0);
  expect(mid[0]!.opacity).toBeGreaterThan(0.05);
  expect(mid[0]!.opacity).toBeLessThan(0.95);
  expect(mid[0]!.opacity + mid[1]!.opacity).toBeCloseTo(1, 1);
  await freeze(row, 5000);
  expect((await icons(0)).map((i) => i.opacity)).toEqual([1, 0]);
  // Unchecking cross-fades back (Crossfade animates both ways).
  await clickAndPause(row, '[data-testid="static-multi-1"] input', 40);
  const back = await icons(1);
  expect(back[0]!.opacity).toBeGreaterThan(0.05);
  expect(back[0]!.opacity).toBeLessThan(0.95);
  // No label offset with an icon either way.
  expect((await parts(button(page, 'multi', 1))).offset).toBe(0);
});

// WebKit may paint a seeked, paused transition at its end value (as for the radio's dot), so the
// frozen frame is captured in Chromium and Firefox only.
test('mid-animation frame: the check scaling in and the label sliding', async ({
  page,
  browserName,
}) => {
  test.skip(browserName === 'webkit', 'WebKit paints a seeked transition at its end value');
  const row = page.getByTestId('static-single');
  await clickAndPause(row, '[data-testid="static-single-1"] input', 48);
  const clip = await box(row);
  await expect(page).toHaveScreenshot('segmented-button-selecting.png', {
    clip,
    animations: 'allow',
  });
});

const clipAround = async (el: Locator) => {
  const b = await box(el);
  return { x: b.x - 8, y: b.y - 8, width: b.width + 16, height: b.height + 16 };
};

for (const [name, i] of [
  ['selected', 0],
  ['unselected', 1],
] as const) {
  test(`${name}: hover and pressed (state layer only)`, async ({ page }) => {
    const target = button(page, 'single', i);
    const clip = await clipAround(page.getByTestId('static-single'));
    await target.hover();
    await expect(page).toHaveScreenshot(`segmented-button-${name}-hovered.png`, { clip });
    const b = await box(target);
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await expect(target).toHaveAttribute('data-pressed', '');
    await expect(page).toHaveScreenshot(`segmented-button-${name}-pressed.png`, { clip });
    await page.mouse.up();
  });
}

test('focus: Tab enters a single-choice row at its selected button and rings it', async ({
  page,
}) => {
  const ring = (el: Locator) => el.evaluate((n) => getComputedStyle(n).outlineStyle);
  // From the next row back: Shift+Tab lands on the selected radio ("Day"), not the last one.
  await input(page, 'multi', 0).focus();
  await page.keyboard.press('Shift+Tab');
  await expect(input(page, 'single', 0)).toBeFocused();
  expect(await ring(button(page, 'single', 0))).toBe('solid');
  await expect(page).toHaveScreenshot('segmented-button-selected-focused.png', {
    clip: await clipAround(page.getByTestId('static-single')),
  });
  // Tab leaves the radio group for the first checkbox of the next row.
  await page.keyboard.press('Tab');
  await expect(input(page, 'multi', 0)).toBeFocused();
  expect(await ring(button(page, 'multi', 0))).toBe('solid');
  await expect(page).toHaveScreenshot('segmented-button-unselected-focused.png', {
    clip: await clipAround(page.getByTestId('static-multi')),
  });
});

test('keyboard: arrows move a single choice (wrapping), Space selects or toggles, Enter does not', async ({
  page,
  browserName,
}) => {
  await input(page, 'single', 0).focus();
  await page.keyboard.press('ArrowRight');
  await expect(input(page, 'single', 1)).toBeFocused();
  await expect(input(page, 'single', 1)).toBeChecked();
  await page.keyboard.press('ArrowRight');
  await expect(input(page, 'single', 2)).toBeChecked();
  await page.keyboard.press('ArrowRight');
  // Native radios wrap in Chromium and Firefox; WebKit's stop at the group's ends (UA behavior,
  // the gap documented for the radio button; React Aria wraps everywhere, below).
  if (browserName === 'webkit') {
    await expect(input(page, 'single', 2)).toBeChecked();
  } else {
    await expect(input(page, 'single', 0)).toBeChecked();
    await page.keyboard.press('ArrowLeft');
    await expect(input(page, 'single', 2)).toBeChecked();
  }
  // Checkboxes: Space toggles, Enter does not (native; Compose and m3.material.io also select on
  // Enter, owner decision M9 #29).
  const push = input(page, 'check', 1);
  await push.focus();
  await page.keyboard.press('Enter');
  await expect(push).not.toBeChecked();
  await page.keyboard.press('Space');
  await expect(push).toBeChecked();
  await page.keyboard.press('Space');
  await expect(push).not.toBeChecked();
  // The disabled button is skipped.
  await input(page, 'partly', 0).focus();
  await page.keyboard.press('ArrowRight');
  await expect(input(page, 'partly', 2)).toBeChecked();

  // React: the same with React Aria (wrapping everywhere).
  const react = page.getByTestId('react-segmented');
  const radios = react.locator('input[type="radio"]');
  await radios.nth(0).focus();
  await page.keyboard.press('ArrowLeft');
  await expect(radios.nth(2)).toBeChecked();
  await expect(radios.nth(2)).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(radios.nth(0)).toBeChecked();
  await page.keyboard.press('Enter');
  await expect(radios.nth(0)).toBeChecked();
  const boxes = react.locator('input[type="checkbox"]');
  await boxes.nth(1).focus();
  await page.keyboard.press('Space');
  await expect(boxes.nth(1)).toBeChecked();
  await expect(page.getByTestId('react-segmented-value')).toHaveText(
    'Range: Day; filters: Trending',
  );
});

test('names and roles: radiogroup / group named by the caption, inputs named by their labels', async ({
  page,
}) => {
  await expect(page.getByRole('radiogroup', { name: 'Range' }).first()).toBeVisible();
  await expect(page.getByRole('group', { name: 'Filters' }).first()).toBeVisible();
  await expect(input(page, 'single', 1)).toHaveAccessibleName('Month');
  await expect(input(page, 'multi', 0)).toHaveAccessibleName('Favorites');
  await expect(input(page, 'disabled', 0)).toBeDisabled();
});

test('the label and the whole button select; a disabled button ignores clicks', async ({
  page,
}) => {
  await button(page, 'single', 2).click();
  await expect(input(page, 'single', 2)).toBeChecked();
  await button(page, 'partly', 1).click({ force: true });
  await expect(input(page, 'partly', 1)).not.toBeChecked();
  // React: the playground's checkbox disables both rows.
  const react = page.getByTestId('react-segmented');
  await react.getByText('Disabled').click();
  await expect(react.locator('.m3e-segmented-button-row').first()).toHaveAttribute(
    'aria-disabled',
    'true',
  );
  await expect(react.locator('input[type="radio"]').first()).toBeDisabled();
});

test('RTL: mirrored; the check scales from its bottom-right corner', async ({ page }) => {
  const first = await box(button(page, 'rtl', 0));
  const last = await box(button(page, 'rtl', 2));
  expect(first.x).toBeGreaterThan(last.x);
  const layout = await button(page, 'rtl', 0).evaluate((el) => {
    const icon = el.querySelector('.m3e-segmented-button__icon')!.getBoundingClientRect();
    const label = el.querySelector('.m3e-segmented-button__label')!.getBoundingClientRect();
    const s = getComputedStyle(el);
    return {
      gap: icon.left - label.right,
      origin: getComputedStyle(el.querySelector('.m3e-segmented-button__check')!).transformOrigin,
      startRadius: Number.parseFloat(s.borderTopRightRadius),
      endRadius: Number.parseFloat(s.borderTopLeftRadius),
    };
  });
  expect(layout.gap).toBeCloseTo(8, 1);
  expect(layout.origin).toBe('18px 18px');
  expect(layout.startRadius).toBeGreaterThan(0);
  expect(layout.endRadius).toBe(0);
  expect((await parts(button(page, 'rtl', 1))).offset).toBe(-13);
});

test.describe('forced colors', () => {
  test.use({ forcedColors: 'active' });

  test('buttons keep a visible border; the selected one is Highlight', async ({ page }) => {
    const style = (row: string, i: number) =>
      button(page, row, i).evaluate((el) => {
        const s = getComputedStyle(el);
        return { border: s.borderTopStyle, width: s.borderTopWidth, bg: s.backgroundColor };
      });
    const off = await style('single', 1);
    expect(off.border).toBe('solid');
    expect(off.width).toBe('1px');
    const on = await style('single', 0);
    expect(on.bg).not.toBe('rgba(0, 0, 0, 0)');
    expect(on.bg).not.toBe(off.bg);
    // Still 40dp high and the content where it was (the padding gives up the border's 1dp).
    expect((await box(button(page, 'single', 1))).height).toBe(40);
    expect((await parts(button(page, 'single', 1))).offset).toBe(-13);
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the label and the check jump (spatial duration 0)', async ({ page }) => {
    await input(page, 'single', 1).check();
    const now = await parts(button(page, 'single', 1));
    expect(now.offset).toBe(0);
    expect(now.scale).toBe(1);
    expect((await parts(button(page, 'single', 0))).offset).toBe(-13);
  });
});
