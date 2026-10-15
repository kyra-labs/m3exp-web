import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';

// Menus (COMPONENT_SPEC §21): acceptance + light/dark × 3 browsers baselines, axe.
const box = async (el: Locator) => (await el.boundingBox())!;
const token = (page: Page, name: string) =>
  page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
const px = async (page: Page, name: string) => Number.parseFloat(await token(page, name));
/** A color token resolved to rgb(), for comparing with computed colors. */
const color = (page: Page, name: string) =>
  page.evaluate((n) => {
    const probe = document.createElement('div');
    probe.style.color = `var(${n})`;
    document.body.append(probe);
    const value = getComputedStyle(probe).color;
    probe.remove();
    return value;
  }, name);
const style = (el: Locator, prop: string) =>
  el.evaluate((node, p) => getComputedStyle(node).getPropertyValue(p), prop);
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
const popup = (page: Page, testId: string) => page.getByTestId(testId).locator('.m3e-menu');
/** Waits until the open springs have settled (scale and opacity at 1). */
const settled = async (menu: Locator) => {
  await expect(menu).toBeVisible();
  await expect
    .poll(() =>
      menu.evaluate((el) =>
        ['--_m3e-menu-scale', '--_m3e-menu-opacity'].map((n) => el.style.getPropertyValue(n)),
      ),
    )
    .toEqual(['1', '1']);
};
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

test.beforeEach(async ({ page }) => {
  await page.goto('/components/menus/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByTestId('react-trigger')).toBeVisible();
});

test('has no axe violations', async ({ page }) => {
  // Disabled items are exempt from contrast (WCAG 1.4.3 "incidental"); scanned without that rule.
  const results = await new AxeBuilder({ page })
    .withTags(AXE_TAGS)
    .exclude('[aria-disabled="true"]')
    .analyze();
  expect(results.violations).toEqual([]);
  const disabled = await new AxeBuilder({ page })
    .withTags(AXE_TAGS)
    .include('[aria-disabled="true"]')
    .disableRules(['color-contrast'])
    .analyze();
  expect(disabled.violations).toEqual([]);
});

test('has no axe violations with menus open (element, submenu, React)', async ({ page }) => {
  const scan = async () => {
    const results = await new AxeBuilder({ page })
      .withTags(AXE_TAGS)
      .exclude('[aria-disabled="true"]')
      .analyze();
    expect(results.violations).toEqual([]);
  };
  await page.locator('#el-style').click();
  await settled(popup(page, 'el-style-menu'));
  await scan();
  await page.keyboard.press('Escape');
  await page.locator('#el-more').click();
  await page.getByRole('menuitem', { name: 'Align' }).first().hover();
  await settled(page.locator('#el-align .m3e-menu'));
  await scan();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await page.getByTestId('react-style-trigger').click();
  await settled(page.getByTestId('react-menus').locator('.m3e-menu'));
  await scan();
});

test('matches the visual baseline', async ({ page }) => {
  await expect(page.getByTestId('static')).toHaveScreenshot('menu-variants.png');
});

test('open menu matches the visual baseline', async ({ page }) => {
  await page.locator('#el-style').click();
  const menu = popup(page, 'el-style-menu');
  await settled(menu);
  await page.mouse.move(0, 0);
  await expect(menu).toHaveScreenshot('menu-open.png');
});

test('sizes: SegmentedMenuTokens.Item, Menu.kt widths and paddings, 20dp icons', async ({
  page,
}) => {
  const standard = page.getByTestId('standard');
  const [edit] = await standard.locator('.m3e-menu__item').all();
  expect((await box(edit!)).height).toBeCloseTo(
    await px(page, '--m3e-comp-segmented-menu-item'),
    0,
  );
  const menuBox = await box(standard);
  const editBox = await box(edit!);
  // Outer padding outside the item surface (DropdownMenuSelectableItemPadding).
  expect(editBox.x - menuBox.x).toBeCloseTo(
    await px(page, '--m3e-comp-menu-item-outer-padding-horizontal'),
    0,
  );
  expect(editBox.width).toBeGreaterThanOrEqual(await px(page, '--m3e-comp-menu-item-min-width'));
  const icon = await box(edit!.locator('.m3e-menu__item-leading .m3e-icon'));
  expect(icon.width).toBe(await px(page, '--m3e-comp-segmented-menu-item-leading-icon-size'));
  // Label after the icon-label space (MenuArrangement).
  const label = await box(edit!.locator('.m3e-menu__item-label'));
  expect(label.x - (icon.x + icon.width)).toBeCloseTo(
    await px(page, '--m3e-comp-menu-item-icon-label-space'),
    0,
  );
  // Baseline DropdownMenuItem: 48dp, no outer padding.
  const baselineItem = page.getByTestId('baseline').locator('.m3e-menu__item').first();
  expect((await box(baselineItem)).height).toBe(
    await px(page, '--m3e-comp-menu-baseline-item-height'),
  );
  // Segmented: groups separated by SegmentedMenuTokens.SegmentedGap.
  const groups = await page.getByTestId('segmented').locator('.m3e-menu__group').all();
  const first = await box(groups[0]!);
  const second = await box(groups[1]!);
  expect(second.y - (first.y + first.height)).toBeCloseTo(
    await px(page, '--m3e-comp-segmented-menu-segmented-gap'),
    0,
  );
});

test('shapes: leading/middle/trailing/selected items and groups (MenuDefaults)', async ({
  page,
}) => {
  const medium = await px(page, '--m3e-sys-shape-corner-medium');
  const xs = await px(page, '--m3e-sys-shape-corner-extra-small');
  const large = await px(page, '--m3e-sys-shape-corner-large');
  const small = await px(page, '--m3e-sys-shape-corner-small');
  const items = await page.getByTestId('standard').locator('.m3e-menu__item').all();
  expect(await radii(items[0]!)).toEqual([medium, medium, xs, xs]);
  expect(await radii(items[1]!)).toEqual([xs, xs, xs, xs]);
  expect(await radii(items.at(-1)!)).toEqual([xs, xs, medium, medium]);
  // Selected (checked) items take the selected shape on every corner.
  const checked = page.getByTestId('segmented').getByRole('menuitemcheckbox', { name: 'Bold' });
  await expect.poll(() => radii(checked)).toEqual([medium, medium, medium, medium]);
  expect(await radii(page.getByTestId('standard'))).toEqual([large, large, large, large]);
  const groups = await page.getByTestId('segmented').locator('.m3e-menu__group').all();
  expect(await radii(groups[0]!)).toEqual([large, large, small, small]);
  expect(await radii(groups[1]!)).toEqual([small, small, small, small]);
  expect(await radii(groups[2]!)).toEqual([small, small, large, large]);
});

test('colors: standard and vibrant selected items, menu containers', async ({ page }) => {
  const checked = page.getByTestId('segmented').getByRole('menuitemcheckbox', { name: 'Bold' });
  await expect
    .poll(() => style(checked, 'background-color'))
    .toBe(await color(page, '--m3e-comp-standard-menu-item-container-color-selected'));
  expect(await style(checked, 'color')).toBe(
    await color(page, '--m3e-comp-standard-menu-item-label-text-color-selected'),
  );
  const vibrant = page.getByTestId('vibrant');
  expect(await style(vibrant, 'background-color')).toBe(
    await color(page, '--m3e-comp-vibrant-menu-container-color'),
  );
  const left = vibrant.getByRole('menuitemradio', { name: 'Left' });
  await expect
    .poll(() => style(left, 'background-color'))
    .toBe(await color(page, '--m3e-comp-vibrant-menu-item-container-color-selected'));
  expect(await style(page.getByTestId('standard'), 'background-color')).toBe(
    await color(page, '--m3e-comp-standard-menu-container-color'),
  );
  expect(await style(page.getByTestId('baseline'), 'background-color')).toBe(
    await color(page, '--m3e-comp-menu-container-color'),
  );
});

test('the menu flips above its trigger when there is no room below', async ({ page }) => {
  const trigger = page.locator('#el-more');
  const menu = popup(page, 'el-menu');
  // Room below: under the trigger, start-aligned.
  await trigger.evaluate((el) => {
    el.scrollIntoView({ block: 'start' });
    window.scrollBy(0, -100);
  });
  await trigger.click();
  await settled(menu);
  let t = await box(trigger);
  let m = await box(menu);
  expect(m.y).toBeGreaterThanOrEqual(t.y + t.height - 0.5);
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  // No room below: bottomToAnchorTop.
  await trigger.evaluate((el) => {
    el.scrollIntoView({ block: 'end' });
  });
  await trigger.click();
  await settled(menu);
  t = await box(trigger);
  m = await box(menu);
  expect(m.y + m.height).toBeLessThanOrEqual(t.y + 0.5);
  expect(await menu.evaluate((el) => el.style.getPropertyValue('--_m3e-menu-origin-y'))).toBe('1');
});

test('opens with scale + fade on the fast spatial / fast effects springs', async ({ page }) => {
  const writes = await page.evaluate(async () => {
    const menu = document.querySelector<HTMLElement>('[data-testid="el-menu"] .m3e-menu')!;
    const seen: [string, string][] = [];
    const observer = new MutationObserver(() => {
      seen.push([
        menu.style.getPropertyValue('--_m3e-menu-scale'),
        menu.style.getPropertyValue('--_m3e-menu-opacity'),
      ]);
    });
    observer.observe(menu, { attributes: true, attributeFilter: ['style'] });
    document.getElementById('el-more')!.click();
    await new Promise((r) => setTimeout(r, 1000));
    observer.disconnect();
    return seen.filter(([s]) => s !== '');
  });
  const closedScale = await px(page, '--m3e-comp-menu-closed-scale');
  expect(writes[0]!.map(Number)).toEqual([
    closedScale,
    await px(page, '--m3e-comp-menu-closed-opacity'),
  ]);
  expect(writes.at(-1)).toEqual(['1', '1']);
  const scales = writes.map(([s]) => Number(s));
  // Frames in flight (how many depends on the browser's frame timing); the expressive fast
  // spatial spring (ζ 0.6) overshoots 1 before settling, so in-flight values pass 1.
  expect(scales.some((s) => s !== closedScale && s !== 1)).toBe(true);
  expect(scales.every((s) => s >= closedScale)).toBe(true);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the spatial spring snaps (duration 0); the fade remains', async ({ page }) => {
    const first = await page.evaluate(async () => {
      const menu = document.querySelector<HTMLElement>('[data-testid="el-menu"] .m3e-menu')!;
      document.getElementById('el-more')!.click();
      await Promise.resolve();
      return [
        menu.style.getPropertyValue('--_m3e-menu-scale'),
        menu.style.getPropertyValue('--_m3e-menu-opacity'),
      ];
    });
    expect(first).toEqual(['1', '0']);
    expect(await px(page, '--m3e-sys-motion-spring-fast-spatial-duration')).toBe(0);
  });
});

test('APG keyboard: arrows, Home/End, Enter activates, Escape returns focus', async ({ page }) => {
  const trigger = page.locator('#el-more');
  await trigger.focus();
  await page.keyboard.press('ArrowDown');
  const menu = popup(page, 'el-menu');
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: 'Cut' })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(menu.getByRole('menuitem', { name: 'Copy' })).toBeFocused();
  // Paste is disabled: skipped.
  await page.keyboard.press('ArrowDown');
  await expect(menu.getByRole('menuitem', { name: 'Align' })).toBeFocused();
  await page.keyboard.press('End');
  await expect(menu.getByRole('menuitem', { name: 'Share' })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(menu.getByRole('menuitem', { name: 'Cut' })).toBeFocused();
  await page.keyboard.press('Home');
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await page.keyboard.press('Enter');
  await expect(menu.getByRole('menuitem', { name: 'Cut' })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(page.locator('#el-log')).toHaveText('copy');
});

test('typeahead selects matching items (element and React)', async ({ page }) => {
  await page.locator('#el-more').focus();
  await page.keyboard.press('ArrowDown');
  const menu = popup(page, 'el-menu');
  await page.keyboard.type('sh');
  await expect(menu.getByRole('menuitem', { name: 'Share' })).toBeFocused();
  await page.keyboard.press('Escape');
  await page.getByTestId('react-trigger').focus();
  await page.keyboard.press('ArrowDown');
  await expect(
    page.getByTestId('react-menus').getByRole('menuitem', { name: 'Cut' }),
  ).toBeFocused();
  await page.waitForTimeout(1100);
  await page.keyboard.type('al');
  await expect(
    page.getByTestId('react-menus').getByRole('menuitem', { name: 'Align' }),
  ).toBeFocused();
});

test('checkable items toggle aria-checked; radios select one (element and React)', async ({
  page,
}) => {
  await page.locator('#el-style').click();
  const menu = popup(page, 'el-style-menu');
  const italic = menu.getByRole('menuitemcheckbox', { name: 'Italic' });
  await expect(italic).toHaveAttribute('aria-checked', 'false');
  await italic.click();
  await expect(italic).toHaveAttribute('aria-checked', 'true');
  // Checkable items keep the menu open on a click.
  await expect(menu).toBeVisible();
  await expect(page.locator('#el-log')).toHaveText('italic: true');
  await page.keyboard.press(' ');
  await expect(italic).toHaveAttribute('aria-checked', 'false');
  // CSS locators: the menu closes on a radio click, and role queries skip hidden elements.
  const radio = (name: string) => menu.locator('[role="menuitemradio"]').filter({ hasText: name });
  await radio('Center').click();
  await expect(radio('Center')).toHaveAttribute('aria-checked', 'true');
  await expect(radio('Left')).toHaveAttribute('aria-checked', 'false');
  // A radio closes the menu.
  await expect(menu).toBeHidden();

  await page.getByTestId('react-style-trigger').click();
  const reactItalic = page
    .getByTestId('react-menus')
    .getByRole('menuitemcheckbox', { name: 'Italic' });
  await reactItalic.click();
  await expect(reactItalic).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByTestId('react-log')).toContainText('Style: bold, italic');
});

test('submenus open on hover and ArrowRight, close on ArrowLeft and Escape', async ({ page }) => {
  await page.locator('#el-more').click();
  const align = popup(page, 'el-menu').getByRole('menuitem', { name: 'Align' });
  await align.hover();
  const submenu = page.locator('#el-align .m3e-menu');
  await expect(submenu).toBeVisible();
  await expect(align).toHaveAttribute('aria-expanded', 'true');
  // MenuAnchorPosition.End: beside the item, top-aligned.
  const a = await box(align);
  const s = await box(submenu);
  expect(s.x).toBeGreaterThanOrEqual(a.x + a.width - 0.5);
  await align.focus();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Escape');
  await page.locator('#el-more').focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowRight');
  await expect(submenu.getByRole('menuitem', { name: 'Left' })).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(submenu).toBeHidden();
  await expect(align).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Escape');
  await expect(submenu).toBeHidden();
  await expect(align).toBeFocused();

  // React: same keys (pointer out of the way, so hovering cannot move focus).
  await page.keyboard.press('Escape');
  await page.mouse.move(0, 0);
  await page.getByTestId('react-trigger').focus();
  await page.keyboard.press('ArrowUp');
  await expect(
    page.getByTestId('react-menus').getByRole('menuitem', { name: 'Share' }),
  ).toBeFocused();
  await page.keyboard.press('ArrowUp');
  const reactAlign = page.getByTestId('react-menus').getByRole('menuitem', { name: 'Align' });
  await expect(reactAlign).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('menuitem', { name: 'Center' }).last()).toBeVisible();
  await page.keyboard.press('ArrowLeft');
  await expect(reactAlign).toBeFocused();
});

test('a click outside closes the menu (light dismiss)', async ({ page }) => {
  await page.locator('#el-vibrant').click();
  const menu = popup(page, 'el-vibrant-menu');
  await settled(menu);
  await page.mouse.click(5, 5);
  await expect(menu).toBeHidden();
});

test('RTL: the menu aligns to the trigger start (right) edge, icons lead on the right', async ({
  page,
}) => {
  const trigger = page.locator('#el-rtl');
  await trigger.click();
  const menu = popup(page, 'el-rtl-menu');
  await settled(menu);
  const t = await box(trigger);
  const m = await box(menu);
  expect(m.x + m.width).toBeCloseTo(t.x + t.width, 0);
  const item = menu.locator('.m3e-menu__item').first();
  const icon = await box(item.locator('.m3e-menu__item-leading'));
  const label = await box(item.locator('.m3e-menu__item-label'));
  expect(icon.x).toBeGreaterThan(label.x);
});

test('CSS only: popovertarget opens the menu without JavaScript wiring', async ({ page }) => {
  await page.getByTestId('css-trigger').click();
  await expect(page.locator('#css-menu')).toBeVisible();
});

test.describe('forced colors', () => {
  test.use({ forcedColors: 'active' });

  test('menu surfaces keep a visible boundary', async ({ page }) => {
    for (const id of ['standard', 'baseline']) {
      expect(await style(page.getByTestId(id), 'border-top-style'), id).toBe('solid');
    }
    const group = page.getByTestId('segmented').locator('.m3e-menu__group').first();
    expect(await style(group, 'border-top-style')).toBe('solid');
  });
});
