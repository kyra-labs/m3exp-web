import AxeBuilder from '@axe-core/playwright';
import { springValue } from '@kyralabs/m3e-motion';
import { type Locator, type Page, expect, test } from '@playwright/test';

// Text fields (COMPONENT_SPEC §26): static m3e-css fields (filled / outlined × empty, filled, icons,
// error, disabled, prefix / suffix, counter, placeholder, label above, read-only, multi-line),
// <m3e-text-field> and React. Acceptance (zero-JS label float, error colors with aria-invalid) +
// light/dark × 3 browsers baselines, axe, geometry against Compose's TextFieldImpl, the label
// spring (CSS transitions frozen at chosen times and compared with the Compose spring), the
// outlined notch (LTR / RTL), keyboard, forced colors, reduced motion.
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
const DISABLED = '[data-testid*="-disabled"]';
const box = async (el: Locator) => (await el.boundingBox())!;
const token = (page: Page, name: string) =>
  page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
const num = async (page: Page, name: string) => Number(await token(page, name));
const field = (page: Page, id: string) => page.getByTestId(id);

/** A CSS color (e.g. `var(--m3e-sys-color-error)`) as the browser computes it. */
const resolveColor = (page: Page, css: string) =>
  page.evaluate((value) => {
    const probe = document.createElement('span');
    probe.style.color = value;
    document.body.append(probe);
    const out = getComputedStyle(probe).color;
    probe.remove();
    return out;
  }, css);

/** Geometry of a field relative to its container (px, rounded to 0.1). */
const geometry = (root: Locator) =>
  root.evaluate((node) => {
    const r = (v: number) => Math.round(v * 10) / 10;
    const c = node.querySelector('.m3e-text-field__container')!.getBoundingClientRect();
    const label = node.querySelector('.m3e-text-field__label');
    const input = node.querySelector('.m3e-text-field__input')!;
    const l = label?.getBoundingClientRect();
    const ls = label ? getComputedStyle(label) : undefined;
    const is = getComputedStyle(input);
    const rtl = getComputedStyle(node).direction === 'rtl';
    const notch = node.querySelector('.m3e-text-field__notch')?.getBoundingClientRect();
    return {
      height: r(c.height),
      offset: r(c.top - node.getBoundingClientRect().top),
      label: l && {
        x: r(rtl ? c.right - l.right : l.left - c.left),
        y: r(l.top - c.top),
        size: ls!.fontSize,
        lineHeight: ls!.lineHeight,
      },
      textX: r(
        (rtl
          ? c.right - input.getBoundingClientRect().right
          : input.getBoundingClientRect().left - c.left) + Number.parseFloat(is.paddingInlineStart),
      ),
      textY: r(input.getBoundingClientRect().top - c.top + Number.parseFloat(is.paddingTop)),
      notch: notch && {
        x: r(rtl ? c.right - notch.right : notch.left - c.left),
        w: r(notch.width),
      },
      labelWidth: l && r(l.width),
    };
  });

/** Colors a field shows. */
const colors = (root: Locator) =>
  root.evaluate((node) => {
    const label = node.querySelector('.m3e-text-field__label');
    const container = node.querySelector('.m3e-text-field__container')!;
    const outline = node.querySelector('.m3e-text-field__outline');
    const supporting = node.querySelector('.m3e-text-field__supporting');
    const input = node.querySelector('.m3e-text-field__input')!;
    return {
      label: label ? getComputedStyle(label).color : null,
      indicator: outline
        ? getComputedStyle(outline).borderTopColor
        : getComputedStyle(container, '::after').borderBottomColor,
      indicatorWidth: outline
        ? getComputedStyle(outline).borderTopWidth
        : getComputedStyle(container, '::after').borderBottomWidth,
      container: getComputedStyle(container).backgroundColor,
      supporting: supporting ? getComputedStyle(supporting).color : null,
      text: getComputedStyle(input).color,
      caret: getComputedStyle(input).caretColor,
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

/** Focuses the field's input and, in the same task, pauses (or seeks) the transitions it starts. */
const focusAndPause = (root: Locator, ms?: number) =>
  root.evaluate((node, t) => {
    node.querySelector<HTMLElement>('.m3e-text-field__input')!.focus();
    getComputedStyle(node).getPropertyValue('--_m3e-text-field-progress');
    for (const a of node.getAnimations({ subtree: true })) {
      a.pause();
      if (t !== null) a.currentTime = t;
    }
  }, ms ?? null);

const clipAround = async (root: Locator) => {
  const b = await box(root);
  return { x: b.x - 8, y: b.y - 12, width: b.width + 16, height: b.height + 20 };
};

test.beforeEach(async ({ page }) => {
  await page.goto('/components/text-field/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByTestId('react-text-fields').locator('.m3e-text-field')).toHaveCount(6);
  await expect(page.locator('m3e-text-field > .m3e-text-field')).toHaveCount(5);
});

test('has no axe violations', async ({ page }) => {
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).exclude(DISABLED).analyze();
  expect(results.violations).toEqual([]);
  // WCAG 1.4.3 exempts inactive components: the disabled fields skip only the contrast rule.
  const disabled = await new AxeBuilder({ page })
    .include(DISABLED)
    .withTags(AXE_TAGS)
    .disableRules(['color-contrast'])
    .analyze();
  expect(disabled.violations).toEqual([]);
});

test('matches the visual baseline', async ({ page }) => {
  await expect(page).toHaveScreenshot('text-field.png', { fullPage: true });
});

test('filled geometry (TextFieldImpl): 56dp, label 16 → 8dp and 16 → 12px, text under the label, 12dp icon padding', async ({
  page,
}) => {
  // Expanded: centred (16dp), bodyLarge; the text row 8 + 16 = 24dp down.
  expect(await geometry(field(page, 'filled-empty'))).toMatchObject({
    height: 56,
    offset: 0,
    label: { x: 16, y: 16, size: '16px', lineHeight: '24px' },
    textX: 16,
    textY: 24,
  });
  // Minimized: 8dp from the top (TextFieldWithLabelVerticalPadding), bodySmall.
  expect(await geometry(field(page, 'filled-filled'))).toMatchObject({
    height: 56,
    label: { x: 16, y: 8, size: '12px', lineHeight: '16px' },
    textY: 24,
  });
  // Icons in 48dp boxes; label and text 16 − 12 = 4dp after the leading one.
  expect(await geometry(field(page, 'filled-icons'))).toMatchObject({
    label: { x: 52, y: 8 },
    textX: 52,
  });
  const icons = field(page, 'filled-icons');
  const lead = await box(icons.locator('.m3e-text-field__leading'));
  const trail = await box(icons.locator('.m3e-text-field__trailing'));
  const container = await box(icons.locator('.m3e-text-field__container'));
  expect(lead.width).toBeCloseTo(48, 1);
  expect(lead.x - container.x).toBeCloseTo(0, 1);
  expect(container.x + container.width - (trail.x + trail.width)).toBeCloseTo(0, 1);
  expect(lead.y - container.y).toBeCloseTo(4, 1);
  // No label: 16dp all round; Above: the label 4dp in, 4dp above the container.
  expect(await geometry(field(page, 'filled-placeholder'))).toMatchObject({ textY: 16 });
  expect(await geometry(field(page, 'filled-above'))).toMatchObject({
    offset: 20,
    label: { x: 4, y: -20, size: '12px' },
    textY: 16,
  });
  // Supporting text: 4dp below, 16dp in; min width 280dp.
  const empty = field(page, 'filled-empty');
  const sup = await box(empty.locator('.m3e-text-field__supporting-text'));
  const c = await box(empty.locator('.m3e-text-field__container'));
  expect(sup.y - (c.y + c.height)).toBeCloseTo(4, 1);
  expect(sup.x - c.x).toBeCloseTo(16, 1);
  // (The docs grid lets its fields shrink; a field elsewhere keeps the 280dp minimum.)
  const minWidth = await page.evaluate(() => {
    const probe = document.createElement('div');
    probe.className = 'm3e-text-field';
    document.body.append(probe);
    const out = getComputedStyle(probe).minInlineSize;
    probe.remove();
    return out;
  });
  expect(minWidth).toBe('280px');
  // The counter at the end of the supporting line.
  const counter = field(page, 'filled-counter');
  const cb = await box(counter.locator('.m3e-text-field__counter'));
  const cc = await box(counter.locator('.m3e-text-field__container'));
  expect(cc.x + cc.width - (cb.x + cb.width)).toBeCloseTo(16, 1);
});

test('outlined geometry: 8dp above for the cutout label, label on the outline, notch = label + 2 × 4dp', async ({
  page,
}) => {
  expect(await geometry(field(page, 'outlined-empty'))).toMatchObject({
    height: 56,
    offset: 8,
    label: { x: 16, y: 16, size: '16px' },
    textY: 16,
    notch: { w: 0 },
  });
  const filled = await geometry(field(page, 'outlined-filled'));
  expect(filled).toMatchObject({ offset: 8, label: { x: 16, y: -8, size: '12px' }, textY: 16 });
  expect(filled.notch!.w).toBeCloseTo(filled.labelWidth! + 8, 0);
  expect(filled.notch!.x).toBeCloseTo(12, 0);
  // With a leading icon the expanded label starts after it; minimized it moves to 16dp.
  expect(await geometry(field(page, 'outlined-icons-empty'))).toMatchObject({
    label: { x: 52, y: 16 },
    textX: 52,
  });
  expect(await geometry(field(page, 'outlined-icons'))).toMatchObject({
    label: { x: 16, y: -8 },
  });
  // Above: no cutout space, no notch.
  expect(await geometry(field(page, 'outlined-above'))).toMatchObject({ offset: 20 });
  await expect(field(page, 'outlined-above').locator('.m3e-text-field__notch')).toHaveCount(0);
});

test('acceptance: the label floats when focused or filled, with no JavaScript', async ({
  page,
}) => {
  // The static fields have no script: the float is :focus / :not(:placeholder-shown) in CSS.
  for (const id of ['filled-empty', 'outlined-empty']) {
    const root = field(page, id);
    const label = root.locator('.m3e-text-field__label');
    await expect(label).toHaveCSS('font-size', '16px');
    await root.locator('input').focus();
    await expect(label).toHaveCSS('font-size', '12px');
    await root.locator('input').blur();
    await expect(label).toHaveCSS('font-size', '16px');
    // Filled (not empty) without focus: minimized.
    await root.locator('input').fill('Some text');
    await root.locator('input').blur();
    await expect(label).toHaveCSS('font-size', '12px');
  }
});

test('the label TextStyle and position spring on fast spatial (overshooting), like Compose’s lerp', async ({
  page,
}) => {
  const spec = {
    dampingRatio: await num(page, '--m3e-sys-motion-spring-fast-spatial-damping-ratio'),
    stiffness: await num(page, '--m3e-sys-motion-spring-fast-spatial-stiffness'),
  };
  const root = field(page, 'outlined-empty');
  await focusAndPause(root);
  let peak = 0;
  for (const t of [16, 40, 80, 120, 200, 320]) {
    await freeze(root, t);
    const g = await geometry(root);
    const p = springValue(spec, t, 0, 1);
    const size = Number.parseFloat(g.label!.size);
    expect(Math.abs(size - (16 - 4 * p)), `font-size t = ${String(t)}ms`).toBeLessThan(0.1);
    // y = lerp(16, −lineHeight / 2, p), lineHeight = lerp(24, 16, p).
    const lh = 24 - 8 * p;
    expect(Math.abs(g.label!.y - (16 + (-lh / 2 - 16) * p)), `y t = ${String(t)}ms`).toBeLessThan(
      0.6,
    );
    peak = Math.max(peak, p);
  }
  expect(spec.dampingRatio).toBeLessThan(1);
  expect(peak).toBeGreaterThan(1.02);
});

// WebKit may paint a seeked, paused transition at its end value (as for the checkbox, radio and
// switch), so the frozen frames are captured in Chromium and Firefox only.
test('mid-float frames: the label on its way up, the notch opening', async ({
  page,
  browserName,
}) => {
  test.skip(browserName === 'webkit', 'WebKit paints a seeked transition at its end value');
  for (const id of ['filled-empty', 'outlined-empty']) {
    const root = field(page, id);
    await focusAndPause(root, 40);
    await expect(page).toHaveScreenshot(`text-field-${id}-floating.png`, {
      clip: await clipAround(root),
      animations: 'allow',
    });
  }
});

for (const id of ['filled-empty', 'outlined-empty', 'filled-error', 'outlined-icons']) {
  test(`${id}: focused (2dp primary indicator / outline, primary label; error stays error)`, async ({
    page,
  }) => {
    const root = field(page, id);
    await root.locator('input').focus();
    await expect(root.locator('.m3e-text-field__label')).toHaveCSS('font-size', '12px');
    await page.waitForTimeout(600);
    const c = await colors(root);
    const role = id.includes('error') ? 'error' : 'primary';
    const expected = await resolveColor(page, `var(--m3e-sys-color-${role})`);
    expect(c.indicator).toBe(expected);
    expect(c.label).toBe(expected);
    expect(c.caret).toBe(expected);
    expect(Number.parseFloat(c.indicatorWidth)).toBeGreaterThan(1.5);
    await expect(page).toHaveScreenshot(`text-field-${id}-focused.png`, {
      clip: await clipAround(root),
    });
  });
}

test('acceptance: aria-invalid="true" applies the error role colors', async ({ page }) => {
  const error = await resolveColor(page, 'var(--m3e-sys-color-error)');
  for (const id of ['filled-filled', 'outlined-filled']) {
    const root = field(page, id);
    const before = await colors(root);
    expect(before.label).not.toBe(error);
    await root.locator('input').evaluate((el) => {
      el.setAttribute('aria-invalid', 'true');
    });
    await page.waitForTimeout(400);
    const after = await colors(root);
    expect(after.label).toBe(error);
    expect(after.indicator).toBe(error);
    expect(after.supporting).toBe(error);
    expect(after.caret).toBe(error);
    // TextFieldColors: the input text stays on-surface with an error.
    expect(after.text).toBe(await resolveColor(page, 'var(--m3e-sys-color-on-surface)'));
  }
  // The static error field: error trailing icon, on-surface-variant leading.
  const trailing = field(page, 'filled-error').locator('.m3e-text-field__trailing');
  await expect(trailing).toHaveCSS('color', error);
});

for (const id of ['filled-filled', 'outlined-filled']) {
  test(`${id}: hover changes no color (TextFieldColors has no hover; owner decision M8 #3)`, async ({
    page,
  }) => {
    const root = field(page, id);
    const rest = await colors(root);
    await root.locator('.m3e-text-field__container').hover();
    await page.waitForTimeout(300);
    expect(await colors(root)).toEqual(rest);
    await expect(page).toHaveScreenshot(`text-field-${id}-hovered.png`, {
      clip: await clipAround(root),
    });
  });
}

test('disabled: Compose’s translucent colors; the filled container keeps ContainerColor', async ({
  page,
}) => {
  const enabled = await colors(field(page, 'filled-filled'));
  const disabled = await colors(field(page, 'filled-disabled'));
  expect(disabled.container).toBe(enabled.container);
  for (const c of [disabled.label, disabled.text, disabled.indicator, disabled.supporting]) {
    expect(c).toMatch(/0\.38\)|\/ 0\.38\)/);
  }
  const outlined = await colors(field(page, 'outlined-disabled'));
  expect(outlined.indicator).toMatch(/0\.12\)|\/ 0\.12\)/);
  await expect(field(page, 'filled-disabled').locator('input')).toBeDisabled();
});

test('placeholder and prefix / suffix only while the label is minimized', async ({ page }) => {
  const root = field(page, 'filled-affix');
  const input = root.locator('input');
  const placeholder = () => input.evaluate((el) => getComputedStyle(el, '::placeholder').opacity);
  const prefix = root.locator('.m3e-text-field__prefix');
  expect(await placeholder()).toBe('0');
  await expect(prefix).toHaveCSS('opacity', '0');
  await input.focus();
  await expect.poll(placeholder).toBe('1');
  await expect(prefix).toHaveCSS('opacity', '1');
  // Without a label the placeholder always shows; Above too.
  expect(
    await field(page, 'filled-placeholder')
      .locator('input')
      .evaluate((el) => getComputedStyle(el, '::placeholder').opacity),
  ).toBe('1');
  expect(
    await field(page, 'outlined-above')
      .locator('input')
      .evaluate((el) => getComputedStyle(el, '::placeholder').opacity),
  ).toBe('1');
});

test('required: a "*" after the label (and in the notch); the label names the input', async ({
  page,
}) => {
  const root = field(page, 'outlined-error');
  const after = await root
    .locator('.m3e-text-field__label')
    .evaluate((el) => getComputedStyle(el, '::after').content);
  expect(after).toBe('"*"');
  await expect(root.locator('input')).toHaveAccessibleName('Username*');
  await expect(root.locator('input')).toHaveAccessibleDescription(
    'Text input too long Character count, 20/10',
  );
  await expect(root.locator('.m3e-text-field__supporting-text')).toHaveAttribute('role', 'alert');
});

test('keyboard: Tab reaches each enabled field, typing floats the label; read-only is focusable', async ({
  page,
}) => {
  const empty = field(page, 'filled-empty').locator('input');
  await empty.focus();
  await page.keyboard.press('Tab');
  await expect(field(page, 'filled-filled').locator('input')).toBeFocused();
  await empty.focus();
  await page.keyboard.type('abc');
  await expect(empty).toHaveValue('abc');
  await field(page, 'filled-readonly').locator('input').focus();
  await expect(field(page, 'filled-readonly').locator('input')).toBeFocused();
  await page.keyboard.type('x');
  await expect(field(page, 'filled-readonly').locator('input')).toHaveValue('Cannot be changed');
});

test('element: the live counter; React: counter, error past 10 characters, clear button', async ({
  page,
}) => {
  const bio = page.getByTestId('element-outlined');
  await bio.locator('input').fill('Hello');
  await expect(bio.locator('.m3e-text-field__counter')).toHaveText('Character count, 5/20');
  const react = page.getByTestId('react-text-fields').locator('.m3e-text-field');
  const user = react.nth(0);
  await user.locator('input').fill('abcdefghijk');
  await expect(user.locator('input')).toHaveAttribute('aria-invalid', 'true');
  await expect(user.locator('.m3e-text-field__supporting-text')).toHaveText('Text input too long');
  await expect(user.locator('.m3e-text-field__counter')).toHaveText('Character count, 11/20');
  const search = react.nth(1);
  await search.getByRole('button', { name: 'Clear text' }).click();
  await expect(search.locator('input')).toHaveValue('');
  await expect(search.getByRole('button', { name: 'Clear text' })).toHaveCount(0);
});

test('multi-line: the textarea grows with its lines (element and React in every engine)', async ({
  page,
}) => {
  for (const area of [
    page.getByTestId('element-multiline').locator('textarea'),
    page.getByTestId('react-text-fields').locator('textarea'),
  ]) {
    const before = (await box(area)).height;
    await area.fill('one\ntwo\nthree');
    await expect.poll(async () => (await box(area)).height).toBeGreaterThan(before + 40);
  }
});

test('RTL: icons, label and notch mirror', async ({ page }) => {
  for (const id of ['outlined-icons', 'outlined-filled', 'filled-icons']) {
    const root = field(page, id);
    const ltr = await geometry(root);
    await root.evaluate((el) => {
      el.setAttribute('dir', 'rtl');
    });
    expect(await geometry(root)).toEqual(ltr);
  }
});

test.describe('forced colors', () => {
  test.use({ forcedColors: 'active' });

  test('the indicator, outline and label use system colors and stay visible', async ({ page }) => {
    const transparent = /rgba\(0, 0, 0, 0\)|\/ 0\)/;
    for (const id of ['filled-filled', 'outlined-filled', 'filled-disabled', 'outlined-disabled']) {
      const c = await colors(field(page, id));
      expect(c.indicator, id).not.toMatch(transparent);
      expect(c.label, id).not.toMatch(transparent);
    }
    // The notch still cuts the outline.
    const g = await geometry(field(page, 'outlined-filled'));
    expect(g.notch!.w).toBeGreaterThan(g.labelWidth!);
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the label jumps (spatial duration 0)', async ({ page }) => {
    const root = field(page, 'filled-empty');
    await focusAndPause(root);
    expect(await geometry(root)).toMatchObject({ label: { y: 8, size: '12px' } });
  });
});
