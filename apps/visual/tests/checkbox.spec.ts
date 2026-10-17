import AxeBuilder from '@axe-core/playwright';
import { springValue } from '@kyralabs/m3e-motion';
import { type Locator, type Page, expect, test } from '@playwright/test';

// Checkbox (COMPONENT_SPEC §22): static m3e-css checkboxes (unchecked / checked / indeterminate ×
// enabled / error / disabled), <m3e-checkbox> (the tri-state sample) and React. Acceptance +
// light/dark × 3 browsers baselines, axe, keyboard, the check path animation (CSS transitions
// frozen at chosen times and compared with the Compose spring), forced colors, reduced motion.
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
const box = async (el: Locator) => (await el.boundingBox())!;
const token = (page: Page, name: string) =>
  page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
const num = async (page: Page, name: string) => Number(await token(page, name));
const checkbox = (page: Page, id: string) => page.getByTestId(id);
type CheckboxHost = HTMLElement & {
  checked: boolean;
  indeterminate: boolean;
  input: HTMLInputElement;
};

/** The two check segments as drawn: start point, angle and drawn length (px, box-relative). */
const segments = (label: Locator) =>
  label.evaluate((root) => {
    const b = root.querySelector('.m3e-checkbox__box')!.getBoundingClientRect();
    return [...root.querySelectorAll<SVGPathElement>('.m3e-checkbox__stroke')].map((path) => {
      const s = getComputedStyle(path);
      const m = new DOMMatrix(s.transform);
      const dash = Number.parseFloat(s.strokeDasharray);
      return {
        x: m.e,
        y: m.f,
        angle: (Math.atan2(m.b, m.a) * 180) / Math.PI,
        drawn: dash - Number.parseFloat(s.strokeDashoffset),
        visible: s.opacity === '1',
        boxWidth: b.width,
      };
    });
  });

/** Freezes every running transition under `root` at `ms` (they stay paused). */
const freeze = (label: Locator, ms: number) =>
  label.evaluate((root, t) => {
    for (const a of root.getAnimations({ subtree: true })) {
      a.pause();
      a.currentTime = t;
    }
  }, ms);

const fraction = (label: Locator) =>
  label.evaluate((root) =>
    Number(
      getComputedStyle(root.querySelector('.m3e-checkbox__box')!).getPropertyValue(
        '--_m3e-checkbox-fraction',
      ),
    ),
  );

test.beforeEach(async ({ page }) => {
  await page.goto('/components/checkbox/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByTestId('react-tree').locator('.m3e-checkbox')).toHaveCount(3);
  await expect(page.locator('m3e-checkbox .m3e-checkbox')).toHaveCount(6);
  // The page sets the static indeterminate inputs from script: let their dashes finish drawing.
  await page.waitForFunction(() =>
    document.getAnimations().every((a) => a.playState !== 'running'),
  );
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
  await expect(page).toHaveScreenshot('checkbox.png', { fullPage: true });
});

test('48dp target, 18dp box (flag-on styling), 40dp state layer circle, label 16dp after', async ({
  page,
}) => {
  expect(await token(page, '--m3e-comp-checkbox-styling-fix')).toBe('1');
  for (const id of ['static-enabled-unchecked', 'static-error-checked', 'static-no-label']) {
    const label = checkbox(page, id);
    const input = await box(label.locator('.m3e-checkbox__input'));
    const b = await box(label.locator('.m3e-checkbox__box'));
    const state = await box(label.locator('.m3e-checkbox__state'));
    expect(input.width).toBe(48);
    expect(input.height).toBe(48);
    expect(b.width).toBeCloseTo(18, 1);
    expect(b.x - input.x).toBeCloseTo(15, 1);
    expect(b.y - input.y).toBeCloseTo(15, 1);
    expect(state.width).toBeCloseTo(40, 1);
    expect(state.x - input.x).toBeCloseTo(4, 1);
    const radius = await label
      .locator('.m3e-checkbox__box')
      .evaluate((el) => getComputedStyle(el).borderTopLeftRadius);
    expect(radius).toBe('2px');
  }
  const label = checkbox(page, 'static-enabled-unchecked');
  const text = await box(label.locator('.m3e-checkbox__label'));
  const input = await box(label.locator('.m3e-checkbox__input'));
  expect(text.x - (input.x + input.width)).toBeCloseTo(16, 1);
});

test('the check is drawCheck’s path (0.25 / 0.65 / 0.75); indeterminate renders a dash', async ({
  page,
}) => {
  const [a, b] = await segments(checkbox(page, 'static-enabled-checked'));
  const s = a!.boxWidth;
  expect(a!.x).toBeCloseTo(0.25 * s, 1);
  expect(a!.y).toBeCloseTo(0.5 * s, 1);
  expect(a!.angle).toBeCloseTo(45, 1);
  expect(a!.drawn).toBeCloseTo(Math.hypot(0.15, 0.15) * s, 1);
  expect(b!.x).toBeCloseTo(0.4 * s, 1);
  expect(b!.y).toBeCloseTo(0.65 * s, 1);
  expect(b!.angle).toBeCloseTo(-45, 1);
  expect(b!.drawn).toBeCloseTo(Math.hypot(0.35, 0.35) * s, 1);

  const dash = await segments(checkbox(page, 'static-enabled-indeterminate'));
  for (const seg of dash) {
    expect(seg.angle).toBeCloseTo(0, 3);
    expect(seg.y).toBeCloseTo(0.5 * s, 1);
    expect(seg.drawn).toBeCloseTo(0.25 * s, 1);
    expect(seg.visible).toBe(true);
  }
  expect(dash[0]!.x).toBeCloseTo(0.25 * s, 1);
  expect(dash[1]!.x).toBeCloseTo(0.5 * s, 1);

  const off = await segments(checkbox(page, 'static-enabled-unchecked'));
  expect(off.every((seg) => !seg.visible && seg.drawn === 0)).toBe(true);
});

test('checking draws the check along its path on the default spatial spring', async ({ page }) => {
  const label = checkbox(page, 'static-enabled-unchecked');
  const spec = {
    dampingRatio: await num(page, '--m3e-sys-motion-spring-default-spatial-damping-ratio'),
    stiffness: await num(page, '--m3e-sys-motion-spring-default-spatial-stiffness'),
  };
  await label.locator('.m3e-checkbox__input').check();
  for (const t of [16, 48, 96, 160, 320]) {
    await freeze(label, t);
    // The CSS spring is a sampled linear() easing of the same spring (Compose SpringSimulation).
    expect(await fraction(label), `t = ${String(t)}ms`).toBeCloseTo(springValue(spec, t, 0, 1), 1);
  }
  await freeze(label, 48);
  const [a, b] = await segments(label);
  const s = a!.boxWidth;
  const total = (Math.hypot(0.15, 0.15) + Math.hypot(0.35, 0.35)) * s;
  const drawn = Math.min(1, await fraction(label)) * total;
  expect(a!.drawn + b!.drawn).toBeCloseTo(drawn, 1);
  expect(a!.drawn).toBeLessThanOrEqual(Math.hypot(0.15, 0.15) * s + 0.01);
});

test('mid-animation frames: drawing the check, morphing it into the dash', async ({ page }) => {
  const label = checkbox(page, 'static-enabled-unchecked');
  await label.locator('.m3e-checkbox__input').check();
  await freeze(label, 40);
  const clip = await box(label.locator('.m3e-checkbox__state'));
  await expect(page).toHaveScreenshot('checkbox-drawing.png', { clip, animations: 'allow' });

  const parent = page.locator('#tree-parent');
  await page.locator('#tree-daily input').click();
  await expect(parent.locator('.m3e-checkbox')).toHaveAttribute('data-from', 'checked');
  const root = parent.locator('.m3e-checkbox');
  await freeze(root, 80);
  const g = await root.evaluate((el) =>
    Number(
      getComputedStyle(el.querySelector('.m3e-checkbox__box')!).getPropertyValue(
        '--_m3e-checkbox-gravitation',
      ),
    ),
  );
  expect(g).toBeGreaterThan(0.1);
  expect(g).toBeLessThan(0.9);
  await expect(page).toHaveScreenshot('checkbox-morphing.png', {
    clip: await box(root.locator('.m3e-checkbox__state')),
    animations: 'allow',
  });
});

test('unchecking fades the check and snaps it away after 100ms; from unchecked the dash draws', async ({
  page,
}) => {
  const label = checkbox(page, 'static-enabled-checked');
  await label.locator('.m3e-checkbox__input').uncheck();
  const timing = await label.evaluate((root) =>
    root
      .getAnimations({ subtree: true })
      .map((a) => [(a as CSSTransition).transitionProperty, a.effect!.getTiming().delay]),
  );
  expect(timing).toContainEqual(['--_m3e-checkbox-fraction', 100]);
  await freeze(label, 99);
  expect(await fraction(label)).toBe(1);
  await freeze(label, 101);
  expect(await fraction(label)).toBe(0);

  // <m3e-checkbox>: unchecked → indeterminate snaps the gravitation (the dash draws, no morph).
  const el = page.locator('#element-indeterminate');
  await el.evaluate((host) => {
    (host as CheckboxHost).indeterminate = false;
  });
  await expect(el.locator('.m3e-checkbox')).toHaveAttribute('data-from', 'indeterminate');
  await page.waitForTimeout(600);
  await el.evaluate((host) => {
    (host as CheckboxHost).indeterminate = true;
  });
  await expect(el.locator('.m3e-checkbox')).toHaveAttribute('data-from', 'unchecked');
  const running = await el.evaluate((host) =>
    host
      .getAnimations({ subtree: true })
      .filter((a) => a.playState === 'running')
      .map((a) => (a as CSSTransition).transitionProperty),
  );
  expect(running).toContain('--_m3e-checkbox-fraction');
  expect(running).not.toContain('--_m3e-checkbox-gravitation');
});

for (const id of ['static-enabled-unchecked', 'static-enabled-checked', 'static-error-checked']) {
  test(`${id}: hover, focus (ring around the state layer) and pressed`, async ({ page }) => {
    const label = checkbox(page, id);
    const s = await box(label.locator('.m3e-checkbox__state'));
    const clip = { x: s.x - 6, y: s.y - 6, width: s.width + 12, height: s.height + 12 };
    await label.locator('.m3e-checkbox__label').hover();
    await expect(page).toHaveScreenshot(`checkbox-${id}-hovered.png`, { clip });
    await page.mouse.move(0, 0);
    await label.locator('.m3e-checkbox__input').focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    const ring = await label
      .locator('.m3e-checkbox__state')
      .evaluate((el) => getComputedStyle(el).outlineStyle);
    expect(ring).toBe('solid');
    await expect(page).toHaveScreenshot(`checkbox-${id}-focused.png`, { clip });
    await page.keyboard.press('Shift+Tab');
    const input = await box(label.locator('.m3e-checkbox__input'));
    await page.mouse.move(input.x + input.width / 2, input.y + input.height / 2);
    await page.mouse.down();
    await expect(label.locator('.m3e-checkbox__state')).toHaveAttribute('data-pressed', '');
    await expect(page).toHaveScreenshot(`checkbox-${id}-pressed.png`, { clip });
    await page.mouse.up();
  });
}

test('the state layer is the box color (flag on), none while unchecked; no outline change', async ({
  page,
}) => {
  const layer = (id: string) =>
    checkbox(page, id)
      .locator('.m3e-checkbox__state')
      .evaluate((el) => getComputedStyle(el, '::before').backgroundColor);
  // color-mix() output, to compare like with like.
  const primary = await page.evaluate(() => {
    const el = document.createElement('div');
    el.style.color = 'color-mix(in srgb, var(--m3e-sys-color-primary) 100%, transparent)';
    document.body.append(el);
    const c = getComputedStyle(el).color;
    el.remove();
    return c;
  });
  expect(await layer('static-enabled-checked')).toBe(primary);
  expect(await layer('static-enabled-unchecked')).toMatch(/(rgba\(0, 0, 0, 0\)|\/ 0\))/);
  const outline = (el: Locator) => el.evaluate((n) => getComputedStyle(n).borderTopColor);
  const target = checkbox(page, 'static-enabled-unchecked');
  const rest = await outline(target.locator('.m3e-checkbox__box'));
  await target.hover();
  expect(await outline(target.locator('.m3e-checkbox__box'))).toBe(rest);
});

test('keyboard: Tab reaches each enabled checkbox, Space toggles, Enter does not', async ({
  page,
}) => {
  const label = checkbox(page, 'static-enabled-unchecked');
  const input = label.locator('.m3e-checkbox__input');
  await input.focus();
  await page.keyboard.press('Enter');
  await expect(input).not.toBeChecked();
  await page.keyboard.press('Space');
  await expect(input).toBeChecked();
  await page.keyboard.press('Space');
  await expect(input).not.toBeChecked();
  await expect(checkbox(page, 'static-disabled-unchecked').locator('input')).toBeDisabled();

  // The tri-state sample (element): the parent follows its children and sets both.
  const parent = page.locator('#tree-parent');
  await page.locator('#tree-daily input').focus();
  await page.keyboard.press('Space');
  await expect(parent.locator('input')).toHaveJSProperty('indeterminate', true);
  await parent.locator('input').focus();
  await page.keyboard.press('Space');
  await expect(page.locator('#tree-daily input')).toBeChecked();
  await expect(page.locator('#tree-weekly input')).toBeChecked();
  await expect(parent.locator('input')).toHaveJSProperty('indeterminate', false);

  // React: the same sample.
  const react = page.getByTestId('react-tree').locator('.m3e-checkbox');
  await react.nth(1).locator('input').focus();
  await page.keyboard.press('Space');
  await expect(react.nth(0).locator('input')).toHaveJSProperty('indeterminate', true);
  await react.nth(0).locator('input').focus();
  await page.keyboard.press('Space');
  await expect(react.nth(1).locator('input')).toBeChecked();
  await expect(react.nth(0).locator('input')).toBeChecked();
});

test('the label toggles the checkbox (Compose’s checkbox-with-text row)', async ({ page }) => {
  const label = checkbox(page, 'static-enabled-unchecked');
  await label.locator('.m3e-checkbox__label').click();
  await expect(label.locator('input')).toBeChecked();
});

test('RTL: the box sits at the inline start; the check is not mirrored', async ({ page }) => {
  const label = checkbox(page, 'static-enabled-checked');
  const ltr = await segments(label);
  await label.evaluate((el) => {
    el.setAttribute('dir', 'rtl');
  });
  const input = await box(label.locator('.m3e-checkbox__input'));
  const text = await box(label.locator('.m3e-checkbox__label'));
  expect(input.x).toBeGreaterThan(text.x);
  const b = await box(label.locator('.m3e-checkbox__box'));
  expect(b.x - input.x).toBeCloseTo(15, 1);
  expect(await segments(label)).toEqual(ltr);
});

test.describe('forced colors', () => {
  test.use({ forcedColors: 'active' });

  test('box outline, checked fill and mark use system colors and stay visible', async ({
    page,
  }) => {
    const style = (id: string) =>
      checkbox(page, id).evaluate((root) => {
        const b = getComputedStyle(root.querySelector('.m3e-checkbox__box')!);
        const m = getComputedStyle(root.querySelector('.m3e-checkbox__mark')!);
        return { border: b.borderTopColor, fill: b.backgroundColor, mark: m.color };
      });
    const off = await style('static-enabled-unchecked');
    expect(off.border).not.toBe('rgba(0, 0, 0, 0)');
    const on = await style('static-enabled-checked');
    expect(on.fill).not.toBe('rgba(0, 0, 0, 0)');
    expect(on.mark).not.toBe(on.fill);
    const disabled = await style('static-disabled-checked');
    expect(disabled.mark).not.toBe(disabled.fill);
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the check jumps (spatial duration 0)', async ({ page }) => {
    const label = checkbox(page, 'static-enabled-unchecked');
    await label.locator('.m3e-checkbox__input').check();
    expect(await fraction(label)).toBe(1);
  });
});
