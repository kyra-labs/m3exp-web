import AxeBuilder from '@axe-core/playwright';
import { springValue } from '@kyralabs/m3e-motion';
import { type Locator, type Page, expect, test } from '@playwright/test';

// Switch (COMPONENT_SPEC §24): static m3e-css switches (unchecked / checked × enabled / disabled,
// icons in the handle, a settings list with leading labels, no label) and React. Acceptance + light/dark ×
// 3 browsers baselines, axe, keyboard (Space toggles, Enter does not), the press snap and the
// spring (CSS transitions frozen at chosen times and compared with the Compose spring), forced
// colors, reduced motion.
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
const DISABLED = '[data-testid$="-disabled"]';
const box = async (el: Locator) => (await el.boundingBox())!;
const token = (page: Page, name: string) =>
  page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
const num = async (page: Page, name: string) => Number(await token(page, name));
const sw = (page: Page, id: string) => page.getByTestId(id);

/** The handle as laid out: offset from the track's inline start and size (px). */
const handle = (label: Locator) =>
  label.evaluate((root) => {
    const track = root.querySelector('.m3e-switch__track')!.getBoundingClientRect();
    const h = root.querySelector('.m3e-switch__handle')!.getBoundingClientRect();
    const rtl = getComputedStyle(root).direction === 'rtl';
    // Rounded to 0.1px: Firefox lays out at sub-pixel precision (51.99998…).
    const r = (v: number) => Math.round(v * 10) / 10;
    return {
      offset: r(rtl ? track.right - h.right : h.left - track.left),
      top: r(h.top - track.top),
      size: r(h.width),
      height: r(h.height),
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
 * Toggles the switch in `root` (input.click(): no press) and, in the same task, pauses (or seeks to
 * `ms`) the transitions the change started, so a slow runner cannot miss them.
 */
const toggleAndPause = (root: Locator, ms?: number) =>
  root.evaluate((node, t) => {
    node.querySelector<HTMLInputElement>('.m3e-switch__input')!.click();
    getComputedStyle(node.querySelector('.m3e-switch__handle')!).getPropertyValue('width');
    for (const a of node.getAnimations({ subtree: true })) {
      a.pause();
      if (t !== null) a.currentTime = t;
    }
  }, ms ?? null);

/** Transitions running on the handle: property and from / to keyframe values. */
const handleTransitions = (label: Locator) =>
  label.evaluate((root) =>
    root
      .querySelector('.m3e-switch__handle')!
      .getAnimations()
      .map((a) => {
        const frames = (a.effect as KeyframeEffect).getKeyframes();
        const prop = (a as CSSTransition).transitionProperty;
        const key = Object.keys(frames[0]!).find(
          (k) => !['offset', 'easing', 'composite', 'computedOffset'].includes(k),
        )!;
        return {
          prop,
          from: String(frames[0]![key]),
          to: String(frames.at(-1)![key]),
          duration: Number((a.effect as KeyframeEffect).getTiming().duration),
        };
      }),
  );

test.beforeEach(async ({ page }) => {
  await page.goto('/components/switch/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByTestId('react-switches').locator('.m3e-switch')).toHaveCount(4);
});

test('has no axe violations', async ({ page }) => {
  const results = await new AxeBuilder({ page })
    .withTags(AXE_TAGS)
    .exclude('[data-testid="static-disabled"]')
    .exclude(DISABLED)
    .analyze();
  expect(results.violations).toEqual([]);
  // WCAG 1.4.3 exempts inactive components: the disabled switches skip only the contrast rule.
  const disabled = await new AxeBuilder({ page })
    .include('[data-testid="static-disabled"]')
    .include(DISABLED)
    .withTags(AXE_TAGS)
    .disableRules(['color-contrast'])
    .analyze();
  expect(disabled.violations).toEqual([]);
});

test('matches the visual baseline', async ({ page }) => {
  await expect(page).toHaveScreenshot('switch.png', { fullPage: true });
});

test('52 × 32dp track in a 48dp target, 2dp outline, handle 16 / 24dp (checked, icon), 40dp state layer, 16dp icons', async ({
  page,
}) => {
  for (const id of ['static-enabled-unchecked', 'static-enabled-checked', 'static-no-label']) {
    const label = sw(page, id);
    const input = await box(label.locator('.m3e-switch__input'));
    const track = await box(label.locator('.m3e-switch__track'));
    expect(input.height).toBeCloseTo(48, 1);
    expect(input.width).toBeGreaterThanOrEqual(52);
    expect(track.width).toBeCloseTo(52, 1);
    expect(track.height).toBeCloseTo(32, 1);
    expect(track.y - input.y).toBeCloseTo(8, 1);
    const outline = await label
      .locator('.m3e-switch__track')
      .evaluate((el) => getComputedStyle(el, '::after').borderTopWidth);
    expect(outline).toBe('2px');
  }
  // Unchecked: 16dp, centred ((32 − 16) / 2 = 8); checked: 24dp at (52 − 24) − 4 = 24.
  expect(await handle(sw(page, 'static-enabled-unchecked'))).toEqual({
    offset: 8,
    top: 8,
    size: 16,
    height: 16,
  });
  expect(await handle(sw(page, 'static-enabled-checked'))).toEqual({
    offset: 24,
    top: 4,
    size: 24,
    height: 24,
  });
  // thumbContent: 24dp unchecked too (centred: 4); a check-only switch is 16dp while unchecked.
  expect(await handle(sw(page, 'static-both-unchecked'))).toMatchObject({ offset: 4, size: 24 });
  expect(await handle(sw(page, 'static-check-unchecked'))).toMatchObject({ offset: 8, size: 16 });
  const icon = sw(page, 'static-both-checked').locator('.m3e-switch__icon--checked');
  const iconBox = await box(icon);
  const handleBox = await box(sw(page, 'static-both-checked').locator('.m3e-switch__handle'));
  expect(iconBox.width).toBeCloseTo(16, 1);
  expect(iconBox.x - handleBox.x).toBeCloseTo(4, 1);
  await expect(
    sw(page, 'static-both-checked').locator('.m3e-switch__icon--unchecked'),
  ).toBeHidden();
  await expect(
    sw(page, 'static-check-unchecked').locator('.m3e-switch__icon--checked'),
  ).toBeHidden();
  // The 40dp state layer circle is centred on the handle.
  for (const id of ['static-enabled-unchecked', 'static-enabled-checked']) {
    const s = await box(sw(page, id).locator('.m3e-switch__state'));
    const h = await box(sw(page, id).locator('.m3e-switch__handle'));
    expect(s.width).toBeCloseTo(40, 1);
    expect(s.x + s.width / 2).toBeCloseTo(h.x + h.width / 2, 1);
    expect(s.y + s.height / 2).toBeCloseTo(h.y + h.height / 2, 1);
  }
  // The label: 12dp after the track (or before it, in the settings list).
  const after = sw(page, 'static-enabled-checked');
  const text = await box(after.locator('.m3e-switch__label'));
  const track = await box(after.locator('.m3e-switch__track'));
  expect(text.x - (track.x + track.width)).toBeCloseTo(12, 1);
  const before = sw(page, 'static-settings-wifi');
  const lead = await box(before.locator('.m3e-switch__label'));
  expect((await box(before.locator('.m3e-switch__track'))).x).toBeGreaterThan(lead.x + lead.width);
});

test('the handle grows to 28dp on press (no animation) and springs back on release', async ({
  page,
}) => {
  const duration = await token(page, '--m3e-sys-motion-spring-fast-spatial-duration');
  const ms = Number.parseFloat(duration) * (duration.endsWith('ms') ? 1 : 1000);
  for (const [id, pressed] of [
    ['static-enabled-unchecked', 2],
    ['static-enabled-checked', 22],
  ] as const) {
    const label = sw(page, id);
    const input = label.locator('.m3e-switch__input');
    const wasChecked = await input.isChecked();
    const t = await box(label.locator('.m3e-switch__track'));
    await page.mouse.move(t.x + t.width / 2, t.y + t.height / 2);
    await page.mouse.down();
    // SnapSpec: the pressed size and offset at once, with no transition.
    expect(await handle(label)).toMatchObject({ offset: pressed, size: 28, height: 28 });
    expect(await handleTransitions(label)).toEqual([]);
    await expect(page).toHaveScreenshot(`switch-${id}-pressed.png`, {
      clip: { x: t.x - 8, y: t.y - 8, width: t.width + 16, height: t.height + 16 },
    });
    await page.mouse.up();
    // The click toggles; release springs from the pressed geometry (fast spatial).
    await expect(input).toBeChecked({ checked: !wasChecked });
    const running = await handleTransitions(label);
    expect(running.length).toBeGreaterThan(0);
    for (const r of running) {
      expect(r.duration, r.prop).toBeCloseTo(ms, 0);
      // From the pressed 28dp (Firefox flushes the release before the click's toggle, so its
      // toggle transition retargets from just under 28).
      if (/width|inline-size|height|block-size/.test(r.prop))
        expect(Number.parseFloat(r.from), r.prop).toBeGreaterThan(27);
    }
    await expect.poll(() => handle(label)).toMatchObject({ size: wasChecked ? 16 : 24 });
  }
});

test('toggling moves and resizes the handle on the fast spatial spring (it overshoots)', async ({
  page,
}) => {
  const label = sw(page, 'static-enabled-unchecked');
  const spec = {
    dampingRatio: await num(page, '--m3e-sys-motion-spring-fast-spatial-damping-ratio'),
    stiffness: await num(page, '--m3e-sys-motion-spring-fast-spatial-stiffness'),
  };
  await toggleAndPause(label);
  await expect(label.locator('input')).toBeChecked();
  let peak = 0;
  for (const t of [16, 48, 96, 160, 240, 320]) {
    await freeze(label, t);
    const h = await handle(label);
    // The CSS spring is a sampled linear() easing of the same spring (Compose SpringSimulation).
    expect(h.offset, `offset t = ${String(t)}ms`).toBeCloseTo(springValue(spec, t, 8, 24), 0);
    expect(h.size, `size t = ${String(t)}ms`).toBeCloseTo(springValue(spec, t, 16, 24), 0);
    peak = Math.max(peak, h.offset);
  }
  // FastSpatial under the expressive scheme (ζ 0.6) overshoots the 24dp target.
  expect(spec.dampingRatio).toBeLessThan(1);
  expect(peak).toBeGreaterThan(24.5);
});

// WebKit may paint a seeked, paused transition at its end value (as for the checkbox and radio),
// so the frozen frame is captured in Chromium and Firefox only.
test('mid-toggle frame: the handle on its way across', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'WebKit paints a seeked transition at its end value');
  const label = sw(page, 'static-check-unchecked');
  await toggleAndPause(label, 60);
  const t = await box(label.locator('.m3e-switch__track'));
  await expect(page).toHaveScreenshot('switch-toggling.png', {
    clip: { x: t.x - 8, y: t.y - 8, width: t.width + 16, height: t.height + 16 },
    animations: 'allow',
  });
});

const clipAround = async (label: Locator) => {
  const t = await box(label.locator('.m3e-switch__track'));
  return { x: t.x - 8, y: t.y - 8, width: t.width + 16, height: t.height + 16 };
};

for (const id of ['static-enabled-unchecked', 'static-enabled-checked', 'static-both-checked']) {
  test(`${id}: hover (state layer only; no handle color change)`, async ({ page }) => {
    const label = sw(page, id);
    const color = () =>
      label.locator('.m3e-switch__handle').evaluate((el) => getComputedStyle(el).backgroundColor);
    const rest = await color();
    await label.locator('.m3e-switch__label').hover();
    expect(await color()).toBe(rest);
    await expect(page).toHaveScreenshot(`switch-${id}-hovered.png`, {
      clip: await clipAround(label),
    });
  });
}

test('focus: Tab rings the track and shows the handle focus layer; Space toggles, Enter does not', async ({
  page,
}) => {
  const label = sw(page, 'static-enabled-unchecked');
  const input = label.locator('input');
  await sw(page, 'static-enabled-checked').locator('input').focus();
  await page.keyboard.press('Tab');
  await expect(input).toBeFocused();
  const ring = await label
    .locator('.m3e-switch__track')
    .evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(ring).toBe('solid');
  await expect(page).toHaveScreenshot('switch-static-enabled-unchecked-focused.png', {
    clip: await clipAround(label),
  });
  await page.keyboard.press('Enter');
  await expect(input).not.toBeChecked();
  // Space held: the handle grows (native :active, or ripple.js's press); release toggles.
  await page.keyboard.down(' ');
  await expect.poll(() => handle(label)).toMatchObject({ offset: 2, size: 28 });
  await page.keyboard.up(' ');
  await expect(input).toBeChecked();
  await expect.poll(() => handle(label)).toMatchObject({ offset: 24, size: 24 });
  await expect(page).toHaveScreenshot('switch-static-enabled-checked-focused.png', {
    clip: await clipAround(label),
  });
});

test('the state layer is the content color, checked or not; colors do not animate', async ({
  page,
}) => {
  for (const id of ['static-enabled-unchecked', 'static-enabled-checked']) {
    const { layer, content, ...transitions } = await sw(page, id).evaluate((root) => ({
      layer: getComputedStyle(root.querySelector('.m3e-switch__state')!, '::before')
        .backgroundColor,
      content: getComputedStyle(root).color,
      track: getComputedStyle(root.querySelector('.m3e-switch__track')!).transitionDuration,
      handle: getComputedStyle(root.querySelector('.m3e-switch__handle')!).transitionProperty,
    }));
    expect(layer, id).toBe(content);
    expect(transitions.track).toBe('0s');
    expect(transitions.handle).not.toMatch(/color|background|all/);
  }
});

test('disabled: opaque colors composited over surface, no press growth, no toggle', async ({
  page,
}) => {
  for (const id of ['static-disabled-unchecked', 'static-disabled-checked']) {
    const colors = await sw(page, id).evaluate((root) => {
      const track = root.querySelector('.m3e-switch__track')!;
      return [
        getComputedStyle(track).backgroundColor,
        getComputedStyle(root.querySelector('.m3e-switch__handle')!).backgroundColor,
      ];
    });
    for (const c of colors) expect(c, id).not.toMatch(/rgba|\/ 0?\.\d/);
  }
  const label = sw(page, 'static-disabled-unchecked');
  const t = await box(label.locator('.m3e-switch__track'));
  await page.mouse.move(t.x + t.width / 2, t.y + t.height / 2);
  await page.mouse.down();
  expect(await handle(label)).toMatchObject({ offset: 8, size: 16 });
  await page.mouse.up();
  await expect(label.locator('input')).not.toBeChecked();
});

test('the label toggles (both positions); React: label, Space, press growth, icons', async ({
  page,
}) => {
  const settings = sw(page, 'static-settings-bluetooth');
  await settings.locator('.m3e-switch__label').click();
  await expect(settings.locator('input')).toBeChecked();
  const react = page.getByTestId('react-switches').locator('.m3e-switch');
  const demo = react.nth(0);
  await expect(demo.locator('input')).toBeChecked();
  await demo.locator('.m3e-switch__label').click();
  await expect(demo.locator('input')).not.toBeChecked();
  await demo.locator('input').focus();
  await page.keyboard.press('Enter');
  await expect(demo.locator('input')).not.toBeChecked();
  await page.keyboard.press('Space');
  await expect(demo.locator('input')).toBeChecked();
  // React Aria's press (data-pressed on the state circle) grows the handle in every engine.
  const icons = react.nth(2);
  const t = await box(icons.locator('.m3e-switch__track'));
  await page.mouse.move(t.x + t.width / 2, t.y + t.height / 2);
  await page.mouse.down();
  await expect(icons.locator('.m3e-switch__state')).toHaveAttribute('data-pressed', '');
  expect(await handle(icons)).toMatchObject({ offset: 2, size: 28 });
  await page.mouse.up();
  await expect(icons.locator('input')).toBeChecked();
  await expect(icons.locator('.m3e-switch__icon--checked')).toBeVisible();
  await expect(icons.locator('.m3e-switch__icon--unchecked')).toBeHidden();
  // The last switch disables the others.
  await react.nth(3).locator('.m3e-switch__label').click();
  await expect(demo.locator('input')).toBeDisabled();
});

test('RTL: the handle starts at the inline start and moves to the inline end', async ({ page }) => {
  for (const [id, offset] of [
    ['static-enabled-unchecked', 8],
    ['static-enabled-checked', 24],
  ] as const) {
    const label = sw(page, id);
    await label.evaluate((el) => {
      el.setAttribute('dir', 'rtl');
    });
    expect(await handle(label)).toMatchObject({ offset });
    const text = await box(label.locator('.m3e-switch__label'));
    expect((await box(label.locator('.m3e-switch__track'))).x).toBeGreaterThan(text.x);
  }
});

test.describe('forced colors', () => {
  test.use({ forcedColors: 'active' });

  test('track, outline and handle use system colors and stay visible', async ({ page }) => {
    const style = (id: string) =>
      sw(page, id).evaluate((root) => {
        const track = root.querySelector('.m3e-switch__track')!;
        return {
          track: getComputedStyle(track).backgroundColor,
          outline: getComputedStyle(track, '::after').borderTopColor,
          outlineWidth: getComputedStyle(track, '::after').borderTopWidth,
          handle: getComputedStyle(root.querySelector('.m3e-switch__handle')!).backgroundColor,
        };
      });
    const transparent = /rgba\(0, 0, 0, 0\)|\/ 0\)/;
    for (const id of [
      'static-enabled-unchecked',
      'static-enabled-checked',
      'static-disabled-unchecked',
      'static-disabled-checked',
    ]) {
      const s = await style(id);
      expect(s.outline, id).not.toMatch(transparent);
      expect(s.outlineWidth, id).toBe('2px');
      expect(s.handle, id).not.toMatch(transparent);
      expect(s.handle, id).not.toBe(s.track);
    }
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the handle jumps (spatial duration 0)', async ({ page }) => {
    const label = sw(page, 'static-enabled-unchecked');
    await toggleAndPause(label);
    expect(await handle(label)).toMatchObject({ offset: 24, size: 24 });
  });
});
