import AxeBuilder from '@axe-core/playwright';
import { springValue } from '@kyralabs/m3e-motion';
import { type Locator, type Page, expect, test } from '@playwright/test';

// Radio button (COMPONENT_SPEC §23): static m3e-css radio groups (Compose's RadioGroupSample;
// selected / unselected × enabled / disabled; a fieldset without visible labels) and React.
// Acceptance + light/dark × 3 browsers baselines, axe, keyboard (arrow keys move the selection),
// the dot animation (CSS transitions frozen at chosen times and compared with the Compose
// spring), forced colors, reduced motion.
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
const box = async (el: Locator) => (await el.boundingBox())!;
const token = (page: Page, name: string) =>
  page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
const num = async (page: Page, name: string) => Number(await token(page, name));
const radio = (page: Page, id: string) => page.getByTestId(id);

/** The dot as drawn: the animated radius (px) and the rendered diameter. */
const dot = (label: Locator) =>
  label.evaluate((root) => {
    const s = getComputedStyle(root.querySelector('.m3e-radio-button__icon')!, '::before');
    return {
      radius: Number.parseFloat(s.getPropertyValue('--_m3e-radio-button-dot-radius')),
      width: Number.parseFloat(s.width),
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
      for (const icon of node.querySelectorAll('.m3e-radio-button__icon')) {
        getComputedStyle(icon, '::before').getPropertyValue('width');
      }
      for (const a of node.getAnimations({ subtree: true })) {
        a.pause();
        if (t !== undefined) a.currentTime = t;
      }
    },
    [selector, ms] as const,
  );

test.beforeEach(async ({ page }) => {
  await page.goto('/components/radio-button/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByTestId('react-radios').locator('.m3e-radio-button')).toHaveCount(8);
});

test('has no axe violations', async ({ page }) => {
  const results = await new AxeBuilder({ page })
    .withTags(AXE_TAGS)
    .exclude('[data-testid="static-disabled"]')
    .analyze();
  expect(results.violations).toEqual([]);
  // WCAG 1.4.3 exempts inactive components: the disabled row skips only the contrast rule.
  const disabled = await new AxeBuilder({ page })
    .include('[data-testid="static-disabled"]')
    .withTags(AXE_TAGS)
    .disableRules(['color-contrast'])
    .analyze();
  expect(disabled.violations).toEqual([]);
});

test('matches the visual baseline', async ({ page }) => {
  await expect(page).toHaveScreenshot('radio-button.png', { fullPage: true });
});

test('48dp target, 20dp ring (2dp stroke), 10dp dot, 40dp state layer, label 16dp after the radio', async ({
  page,
}) => {
  for (const id of ['static-enabled-selected', 'static-enabled-unselected', 'static-no-label']) {
    const label = radio(page, id);
    const input = await box(label.locator('.m3e-radio-button__input'));
    const ring = await box(label.locator('.m3e-radio-button__icon'));
    const state = await box(label.locator('.m3e-radio-button__state'));
    expect(input.width).toBe(48);
    expect(input.height).toBe(48);
    expect(ring.width).toBeCloseTo(20, 1);
    expect(ring.height).toBeCloseTo(20, 1);
    expect(ring.x - input.x).toBeCloseTo(14, 1);
    expect(ring.y - input.y).toBeCloseTo(14, 1);
    expect(state.width).toBeCloseTo(40, 1);
    expect(state.x - input.x).toBeCloseTo(4, 1);
    const border = await label
      .locator('.m3e-radio-button__icon')
      .evaluate((el) => getComputedStyle(el).borderTopWidth);
    expect(border).toBe('2px');
  }
  // RadioButtonDotSize / 2 = 6dp, drawn at 6 − stroke / 2 = 5dp: a 10dp dot; none unselected.
  expect(await dot(radio(page, 'static-enabled-selected'))).toEqual({ radius: 6, width: 10 });
  expect(await dot(radio(page, 'static-enabled-unselected'))).toEqual({ radius: 0, width: 0 });
  // RadioGroupSample: 16dp after the 24dp (padded) radio, i.e. 4dp after the 48dp target.
  const label = radio(page, 'static-group-calls');
  const text = await box(label.locator('.m3e-radio-button__label'));
  const ring = await box(label.locator('.m3e-radio-button__icon'));
  expect(text.x - (ring.x + ring.width + 2)).toBeCloseTo(16, 1);
  // 56dp option rows in a vertical group.
  expect((await box(label)).height).toBeCloseTo(56, 1);
});

test('selecting grows the dot on the fast spatial spring (it overshoots); the old one shrinks', async ({
  page,
}) => {
  const group = page.getByTestId('static-group');
  const spec = {
    dampingRatio: await num(page, '--m3e-sys-motion-spring-fast-spatial-damping-ratio'),
    stiffness: await num(page, '--m3e-sys-motion-spring-fast-spatial-stiffness'),
  };
  await clickAndPause(group, '[data-testid="static-group-missed"] input');
  await expect(radio(page, 'static-group-missed').locator('input')).toBeChecked();
  let peak = 0;
  for (const t of [16, 48, 96, 160, 240, 320]) {
    await freeze(group, t);
    const grow = await dot(radio(page, 'static-group-missed'));
    const shrink = await dot(radio(page, 'static-group-calls'));
    // The CSS spring is a sampled linear() easing of the same spring (Compose SpringSimulation).
    expect(grow.radius, `grow t = ${String(t)}ms`).toBeCloseTo(springValue(spec, t, 0, 6), 0);
    expect(shrink.radius, `shrink t = ${String(t)}ms`).toBeCloseTo(springValue(spec, t, 6, 0), 0);
    // Drawn at radius − stroke / 2, nothing at or below 0 (Compose: `if (radius > 0)`).
    expect(grow.width).toBeCloseTo(Math.max(0, 2 * grow.radius - 2), 1);
    expect(shrink.width).toBeCloseTo(Math.max(0, 2 * shrink.radius - 2), 1);
    peak = Math.max(peak, grow.radius);
  }
  // FastSpatial under the expressive scheme (ζ 0.6) overshoots the 6dp target.
  expect(await num(page, '--m3e-sys-motion-spring-fast-spatial-damping-ratio')).toBeLessThan(1);
  expect(peak).toBeGreaterThan(6.2);
});

// WebKit may paint a seeked, paused transition at its end value (as for the checkbox's check), so
// the frozen frame is captured in Chromium and Firefox only.
test('mid-animation frame: the dot growing', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'WebKit paints a seeked transition at its end value');
  const group = page.getByTestId('static-group');
  await clickAndPause(group, '[data-testid="static-group-friends"] input', 40);
  const clip = await box(radio(page, 'static-group-friends').locator('.m3e-radio-button__state'));
  await expect(page).toHaveScreenshot('radio-button-growing.png', { clip, animations: 'allow' });
});

const clipAround = async (label: Locator) => {
  const s = await box(label.locator('.m3e-radio-button__state'));
  return { x: s.x - 6, y: s.y - 6, width: s.width + 12, height: s.height + 12 };
};

for (const id of ['static-enabled-selected', 'static-enabled-unselected']) {
  test(`${id}: hover and pressed (state layer only)`, async ({ page }) => {
    const label = radio(page, id);
    const clip = await clipAround(label);
    await label.locator('.m3e-radio-button__label').hover();
    await expect(page).toHaveScreenshot(`radio-button-${id}-hovered.png`, { clip });
    const input = await box(label.locator('.m3e-radio-button__input'));
    await page.mouse.move(input.x + input.width / 2, input.y + input.height / 2);
    await page.mouse.down();
    await expect(label.locator('.m3e-radio-button__state')).toHaveAttribute('data-pressed', '');
    await expect(page).toHaveScreenshot(`radio-button-${id}-pressed.png`, { clip });
    await page.mouse.up();
  });
}

test('focus: Tab enters a group at its selected radio (or the first) and rings its state layer', async ({
  page,
}) => {
  // The ring grows from a zero-width outline (D19 (3)): its width, polled.
  const ringed = (label: Locator) =>
    label.locator('.m3e-radio-button__state').evaluate((el) => getComputedStyle(el).outlineWidth);
  // From the sample group to the next group's selected radio.
  await radio(page, 'static-group-friends').locator('input').focus();
  await page.keyboard.press('Tab');
  const selected = radio(page, 'static-enabled-selected');
  await expect(selected.locator('input')).toBeFocused();
  await expect.poll(() => ringed(selected)).toBe('3px');
  await expect(page).toHaveScreenshot('radio-button-static-enabled-selected-focused.png', {
    clip: await clipAround(selected),
  });
  // The disabled group is skipped; the fieldset has no selection, so Tab lands on its first radio.
  await page.keyboard.press('Tab');
  const first = radio(page, 'static-no-label');
  await expect(first.locator('input')).toBeFocused();
  await expect(first.locator('input')).not.toBeChecked();
  await expect.poll(() => ringed(first)).toBe('3px');
  await expect(page).toHaveScreenshot('radio-button-static-unselected-focused.png', {
    clip: await clipAround(first),
  });
});

test('the state layer is the content color, selected or not; hover changes no ring color', async ({
  page,
}) => {
  const layer = (id: string) =>
    radio(page, id).evaluate((root) => ({
      layer: getComputedStyle(root.querySelector('.m3e-radio-button__state')!, '::before')
        .backgroundColor,
      content: getComputedStyle(root).color,
    }));
  for (const id of ['static-enabled-selected', 'static-enabled-unselected']) {
    const { layer: color, content } = await layer(id);
    expect(color, id).toBe(content);
  }
  const ringColor = (el: Locator) =>
    el.locator('.m3e-radio-button__icon').evaluate((n) => getComputedStyle(n).borderTopColor);
  for (const id of ['static-enabled-selected', 'static-enabled-unselected']) {
    const target = radio(page, id);
    const rest = await ringColor(target);
    await target.hover();
    expect(await ringColor(target)).toBe(rest);
  }
});

test('the disabled color snaps; the enabled color animates on default effects', async ({
  page,
}) => {
  const duration = (id: string) =>
    radio(page, id)
      .locator('.m3e-radio-button__icon')
      .evaluate((el) => getComputedStyle(el).transitionDuration);
  expect(await duration('static-disabled-selected')).toBe('0s');
  const effects = await token(page, '--m3e-sys-motion-spring-default-effects-duration');
  const seconds = (t: string) => Number.parseFloat(t) / (t.endsWith('ms') ? 1000 : 1);
  expect(seconds(await duration('static-enabled-selected'))).toBeCloseTo(seconds(effects), 3);
  expect(seconds(effects)).toBeGreaterThan(0);
});

test('keyboard: Tab enters at the selected radio, arrows move the selection and wrap, Space selects', async ({
  page,
  browserName,
}) => {
  const input = (o: string) => radio(page, `static-group-${o}`).locator('input');
  await input('calls').focus();
  await expect(input('calls')).toBeChecked();
  await page.keyboard.press('ArrowDown');
  await expect(input('missed')).toBeFocused();
  await expect(input('missed')).toBeChecked();
  await page.keyboard.press('ArrowRight');
  await expect(input('friends')).toBeChecked();
  await page.keyboard.press('ArrowDown');
  // Native radios wrap in Chromium and Firefox; WebKit's stop at the group's ends (UA behavior,
  // a known gap of the zero-JS layer; React Aria wraps everywhere, below).
  if (browserName === 'webkit') {
    await expect(input('friends')).toBeChecked();
    await expect(input('friends')).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await expect(input('missed')).toBeChecked();
  } else {
    await expect(input('calls')).toBeChecked();
    await expect(input('calls')).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await expect(input('friends')).toBeChecked();
    await page.keyboard.press('ArrowLeft');
    await expect(input('missed')).toBeChecked();
  }
  // Shift+Tab leaves the group, Tab comes back to the selected radio.
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(input('missed')).toBeFocused();
  // Enter does not select; Space selects the focused radio.
  const none = page.getByTestId('static-fieldset').locator('input');
  await none.nth(0).focus();
  await page.keyboard.press('Enter');
  await expect(none.nth(0)).not.toBeChecked();
  await page.keyboard.press('Space');
  await expect(none.nth(0)).toBeChecked();
  await expect(radio(page, 'static-disabled-unselected').locator('input')).toBeDisabled();

  // React: the same with React Aria.
  const react = page.getByTestId('react-radios').locator('.m3e-radio-group').first();
  const inputs = react.locator('input');
  await inputs.nth(0).focus();
  await page.keyboard.press('ArrowDown');
  await expect(inputs.nth(1)).toBeChecked();
  await expect(inputs.nth(1)).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  await expect(inputs.nth(2)).toBeChecked();
  await page.keyboard.press('Enter');
  await expect(inputs.nth(2)).toBeChecked();
});

test('Space selects a focused unselected radio (native and React)', async ({ page }) => {
  const inputs = page.getByTestId('static-fieldset').locator('input');
  await inputs.nth(1).focus();
  await page.keyboard.press('Space');
  await expect(inputs.nth(1)).toBeChecked();
  const react = page.getByTestId('react-radios').locator('.m3e-radio-group').nth(2);
  await react.locator('input').nth(2).focus();
  await page.keyboard.press('Space');
  await expect(react.locator('input').nth(2)).toBeChecked();
});

test('the label selects the radio (Compose’s radio group rows); disabled ignores it', async ({
  page,
}) => {
  await radio(page, 'static-group-friends').locator('.m3e-radio-button__label').click();
  await expect(radio(page, 'static-group-friends').locator('input')).toBeChecked();
  const react = page.getByTestId('react-radios').locator('.m3e-radio-group');
  await react.nth(1).getByText('Disabled').click();
  await expect(react.nth(2)).toHaveAttribute('aria-disabled', 'true');
  await expect(react.nth(2).locator('input').first()).toBeDisabled();
  await react.nth(2).getByText('Small').click({ force: true });
  await expect(react.nth(2).locator('input').first()).not.toBeChecked();
});

test('RTL: the ring sits at the inline start', async ({ page }) => {
  const label = radio(page, 'static-group-calls');
  await label.evaluate((el) => {
    el.setAttribute('dir', 'rtl');
  });
  const input = await box(label.locator('.m3e-radio-button__input'));
  const text = await box(label.locator('.m3e-radio-button__label'));
  const ring = await box(label.locator('.m3e-radio-button__icon'));
  expect(input.x).toBeGreaterThan(text.x);
  expect(ring.x - input.x).toBeCloseTo(14, 1);
});

test.describe('forced colors', () => {
  test.use({ forcedColors: 'active' });

  test('ring and dot use system colors and stay visible', async ({ page }) => {
    const style = (id: string) =>
      radio(page, id).evaluate((root) => {
        const icon = root.querySelector('.m3e-radio-button__icon')!;
        const ring = getComputedStyle(icon);
        const d = getComputedStyle(icon, '::before');
        return {
          ring: ring.borderTopColor,
          ringWidth: ring.borderTopWidth,
          dot: d.backgroundColor,
          dotWidth: d.width,
        };
      });
    const transparent = /rgba\(0, 0, 0, 0\)|\/ 0\)/;
    const off = await style('static-enabled-unselected');
    expect(off.ring).not.toMatch(transparent);
    expect(off.ringWidth).toBe('2px');
    const on = await style('static-enabled-selected');
    expect(on.dot).not.toMatch(transparent);
    expect(on.dotWidth).toBe('10px');
    expect(on.dot).toBe(on.ring);
    const disabled = await style('static-disabled-selected');
    expect(disabled.dot).not.toMatch(transparent);
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the dot jumps (spatial duration 0)', async ({ page }) => {
    const label = radio(page, 'static-group-missed');
    await label.locator('.m3e-radio-button__input').check();
    expect(await dot(label)).toEqual({ radius: 6, width: 10 });
    expect(await dot(radio(page, 'static-group-calls'))).toEqual({ radius: 0, width: 0 });
  });
});
