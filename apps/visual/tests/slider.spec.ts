import AxeBuilder from '@axe-core/playwright';
import { sliderTrackGeometry } from '@kyralabs/m3e-motion';
import { type Locator, type Page, expect, test } from '@playwright/test';

// Slider (COMPONENT_SPEC §25): static m3e-css sliders (standard, stops, range, centered, disabled,
// sizes XS–XL with inset icons, vertical), <m3e-slider> and React. Acceptance + light/dark ×
// 3 browsers baselines, axe, the drawn geometry against m3e-motion's port of Compose's drawTrack,
// keyboard (steps equal `step`, pages, Home / End, RTL, vertical), pointer drag, range thumbs that
// cannot cross, the handle shrink and value indicator, focus, forced colors.
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
const DISABLED = '[data-testid^="static-disabled"]';
const box = async (el: Locator) => (await el.boundingBox())!;
/** The track's box after scrolling it into view (page.mouse does not scroll). */
const trackBox = async (s: Locator) => {
  const track = s.locator('.m3e-slider__track');
  await track.scrollIntoViewIfNeeded();
  return box(track);
};

/** Size → [track thickness, handle length, corner] (the token DB, slider-defaults.css). */
const SIZES = {
  xs: [16, 44, 8],
  s: [24, 44, 8],
  m: [40, 44, 12],
  l: [56, 68, 16],
  xl: [96, 108, 28],
} as const;

/** What the page draws for a slider, along its track (from the inline start; vertical: from the bottom). */
const measure = (slider: Locator) =>
  slider.evaluate((root) => {
    const track = root.querySelector('.m3e-slider__track')!.getBoundingClientRect();
    const vertical = root.classList.contains('m3e-slider--vertical');
    const rtl = getComputedStyle(root).direction === 'rtl';
    const span = (r: DOMRect) =>
      vertical
        ? { start: track.bottom - r.bottom, end: track.bottom - r.top }
        : rtl
          ? { start: track.right - r.right, end: track.right - r.left }
          : { start: r.left - track.left, end: r.right - track.left };
    const centre = (r: DOMRect) => {
      const s = span(r);
      return (s.start + s.end) / 2;
    };
    const part = (cls: string) => {
      const r = root.querySelector(cls)!.getBoundingClientRect();
      return r.width > 0 && r.height > 0 ? span(r) : null;
    };
    return {
      length: vertical ? track.height : track.width,
      thumbs: [...root.querySelectorAll('.m3e-slider__thumb')].map((t) =>
        centre(t.getBoundingClientRect()),
      ),
      parts: {
        'inactive-start': part('.m3e-slider__inactive-start'),
        active: part('.m3e-slider__active'),
        'inactive-end': part('.m3e-slider__inactive-end'),
      },
      ticks: [...root.querySelectorAll('.m3e-slider__tick')]
        .filter((t) => t.getBoundingClientRect().width > 0)
        .map((t) => centre(t.getBoundingClientRect())),
      stops: [...root.querySelectorAll('.m3e-slider__inactive-start, .m3e-slider__inactive-end')]
        .filter((p) => {
          const s = getComputedStyle(p, '::after');
          return s.display !== 'none' && Number.parseFloat(s.width) > 0;
        })
        .map((p) => {
          const s = getComputedStyle(p, '::after');
          const r = span(p.getBoundingClientRect());
          const start = p.classList.contains('m3e-slider__inactive-start');
          const corner = Number.parseFloat(
            (vertical
              ? start
                ? s.insetBlockEnd
                : s.insetBlockStart
              : start
                ? s.insetInlineStart
                : s.insetInlineEnd) || '0',
          );
          const half = Number.parseFloat(s.width) / 2;
          return start ? r.start + corner + half : r.end - corner - half;
        }),
    };
  });

interface Config {
  values: number[];
  steps?: number;
  size?: keyof typeof SIZES;
  centered?: boolean;
  icon?: boolean;
}

const expectGeometry = async (slider: Locator, c: Config) => {
  const m = await measure(slider);
  const [, , corner] = SIZES[c.size ?? 'xs'];
  const range = c.values.length > 1;
  const g = sliderTrackGeometry({
    length: m.length,
    cornerSize: corner,
    insideCornerSize: 2,
    thumbWidth: 4,
    gapSize: 6,
    steps: c.steps ?? 0,
    fraction: c.values.at(-1)!,
    ...(range ? { startFraction: c.values[0]! } : {}),
    centered: c.centered ?? false,
    cornerShrinking: c.centered ? true : range ? false : (c.size ?? 'xs') !== 'xs',
    stopIndicator: !c.icon,
  });
  const near = (a: number, b: number, what: string) => {
    expect(Math.abs(a - b), `${what}: ${String(a)} vs ${String(b)}`).toBeLessThan(0.75);
  };
  g.thumbs.forEach((t, i) => {
    near(m.thumbs[i]!, t, `thumb ${String(i)}`);
  });
  for (const kind of ['inactive-start', 'active', 'inactive-end'] as const) {
    const want = g.parts.find((p) => p.kind === kind);
    const got = m.parts[kind];
    expect(Boolean(got), `${kind} drawn`).toBe(Boolean(want));
    if (want && got) {
      near(got.start, want.start, `${kind} start`);
      near(got.end, want.end, `${kind} end`);
    }
  }
  expect(m.ticks.length, 'ticks').toBe(g.ticks.length);
  g.ticks.forEach((t, i) => {
    near(m.ticks[i]!, t.position, `tick ${String(i)}`);
  });
  expect(m.stops.length, 'stops').toBe(g.stops.length);
  [...g.stops]
    .sort((a, b) => a - b)
    .forEach((s, i) => {
      near([...m.stops].sort((a, b) => a - b)[i]!, s, `stop ${String(i)}`);
    });
};

const slider = (page: Page, id: string) => page.getByTestId(id).locator('.m3e-slider');
const values = (s: Locator) =>
  s
    .locator('input')
    .evaluateAll((inputs) => inputs.map((i) => Number((i as HTMLInputElement).value)));
const handleWidth = (s: Locator, i = 0) =>
  s
    .locator('.m3e-slider__handle')
    .nth(i)
    .evaluate((el) => el.getBoundingClientRect().width);

test.beforeEach(async ({ page }) => {
  await page.goto('/components/slider/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByTestId('react-sliders').locator('.m3e-slider')).toHaveCount(6);
  await expect(page.getByTestId('element-sliders').locator('.m3e-slider')).toHaveCount(5);
});

test('has no axe violations', async ({ page }) => {
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).exclude(DISABLED).analyze();
  expect(results.violations).toEqual([]);
  // WCAG 1.4.3 exempts inactive components: the disabled sliders skip only the contrast rule.
  const disabled = await new AxeBuilder({ page })
    .include(DISABLED)
    .withTags(AXE_TAGS)
    .disableRules(['color-contrast'])
    .analyze();
  expect(disabled.violations).toEqual([]);
});

test('matches the visual baseline', async ({ page }) => {
  await expect(page).toHaveScreenshot('slider.png', { fullPage: true });
});

test('draws Compose’s track geometry: thumbs, parts and gaps, stops, ticks (drawTrack port)', async ({
  page,
}) => {
  const configs: [string, Config][] = [
    ['static-standard', { values: [0.4] }],
    ['static-standard-min', { values: [0] }],
    ['static-stops', { values: [0.4], steps: 4 }],
    ['static-range', { values: [0.2, 0.7] }],
    ['static-range-stops', { values: [0.3, 0.7], steps: 9 }],
    ['static-centered', { values: [0.3], centered: true }],
    ['static-centered-stops', { values: [0.7], centered: true, steps: 9 }],
    ['static-size-s', { values: [0.5], size: 's' }],
    ['static-size-m', { values: [0.5], size: 'm', icon: true }],
    ['static-size-l', { values: [0.5], size: 'l', icon: true }],
    ['static-size-xl', { values: [0.98], size: 'xl', icon: true }],
  ];
  for (const [id, c] of configs) {
    await test.step(id, () => expectGeometry(slider(page, id), c));
  }
  const vertical = page.getByTestId('static-vertical').locator('.m3e-slider');
  await expectGeometry(vertical.nth(0), { values: [0.3] });
  await expectGeometry(vertical.nth(1), { values: [0.6], steps: 4 });
  await expectGeometry(vertical.nth(2), { values: [0.7], centered: true });
});

test('sizes: track thickness, handle length and target from the token DB', async ({ page }) => {
  for (const [size, [thickness, handle]] of Object.entries(SIZES)) {
    const s = slider(page, `static-size-${size}`);
    const root = await box(s);
    const active = await box(s.locator('.m3e-slider__active'));
    const h = await box(s.locator('.m3e-slider__handle'));
    expect(active.height, size).toBeCloseTo(thickness, 1);
    expect(h.height, size).toBeCloseTo(handle, 1);
    expect(h.width, size).toBeCloseTo(4, 1);
    expect(root.height, size).toBeCloseTo(Math.max(48, handle), 1);
  }
});

test('inset icon: on the active track when it fits, else at the start of the inactive track', async ({
  page,
}) => {
  const icon = (id: string, inactive: boolean) =>
    slider(page, id).locator(
      `.m3e-slider__icon${inactive ? '--inactive' : ':not(.m3e-slider__icon--inactive)'}`,
    );
  // M at 50%: 24dp icon 6dp in, in the active tick color.
  const fits = await box(icon('static-size-m', false));
  const track = await box(slider(page, 'static-size-m').locator('.m3e-slider__track'));
  expect(fits.width).toBeCloseTo(24, 1);
  expect(fits.x - track.x).toBeCloseTo(6, 1);
  expect((await box(icon('static-size-m', true))).width).toBe(0);
  // M at 5%: the active part (≈ 13dp) is too short, so the icon moves after the thumb.
  expect((await box(icon('static-size-m-low', false))).width).toBe(0);
  const moved = await box(icon('static-size-m-low', true));
  const thumb = await box(slider(page, 'static-size-m-low').locator('.m3e-slider__thumb'));
  expect(moved.width).toBeCloseTo(24, 1);
  expect(moved.x - (thumb.x + thumb.width / 2)).toBeCloseTo(8 + 6, 0);
  const [active, inactive] = await Promise.all(
    [icon('static-size-m', false), icon('static-size-m-low', true)].map((l) =>
      l.evaluate((el) => getComputedStyle(el).color),
    ),
  );
  expect(active).not.toBe(inactive);
  // XL: 32dp, 8dp in; XS / S show none.
  expect((await box(icon('static-size-xl', false))).width).toBeCloseTo(32, 1);
  await expect(slider(page, 'static-size-s').locator('.m3e-slider__icon')).toHaveCount(0);
});

test('keyboard steps equal `step`; pages; Home / End (element and React)', async ({ page }) => {
  for (const group of ['element-sliders', 'react-sliders']) {
    const s = page.getByTestId(group).locator('.m3e-slider').nth(1); // 0..100, step 10, at 40
    const input = s.locator('input');
    await input.focus();
    await page.keyboard.press('ArrowRight');
    expect(await values(s), group).toEqual([50]);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowLeft');
    expect(await values(s), group).toEqual([30]);
    await page.keyboard.press('PageUp');
    expect(await values(s), group).toEqual([40]);
    await page.keyboard.press('End');
    expect(await values(s), group).toEqual([100]);
    await page.keyboard.press('Home');
    expect(await values(s), group).toEqual([0]);
    await expect(input).toHaveAttribute('aria-valuetext', '0');
    // Continuous: 1 % per key, Shift + arrow 10 %.
    const c = page.getByTestId(group).locator('.m3e-slider').nth(0);
    await c.locator('input').focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Shift+ArrowRight');
    expect((await values(c))[0], group).toBeCloseTo(0.51, 5);
  }
});

test('range thumbs cannot cross (keyboard and pointer); each is its own labelled slider', async ({
  page,
}) => {
  for (const group of ['element-sliders', 'react-sliders']) {
    const s = page.getByTestId(group).locator('.m3e-slider').nth(2); // 20 – 80, step 10
    const [start, end] = [s.locator('input').nth(0), s.locator('input').nth(1)];
    await expect(start).toHaveAttribute('aria-label', 'Range start');
    await expect(end).toHaveAttribute('aria-label', 'Range end');
    await start.focus();
    await page.keyboard.press('End');
    expect(await values(s), group).toEqual([80, 80]);
    await page.keyboard.press('ArrowRight');
    expect(await values(s), group).toEqual([80, 80]);
    await end.focus();
    await page.keyboard.press('ArrowLeft');
    expect(await values(s), group).toEqual([80, 80]);
    await page.keyboard.press('ArrowRight');
    expect(await values(s), group).toEqual([80, 90]);
    // Drag the start thumb past the end one: it stops there.
    const track = await trackBox(s);
    await page.mouse.move(track.x + track.width * 0.1, track.y + track.height / 2);
    await page.mouse.down();
    expect((await values(s))[0], group).toBe(10);
    await page.mouse.move(track.x + track.width * 0.98, track.y + track.height / 2, { steps: 6 });
    expect(await values(s), group).toEqual([90, 90]);
    await page.mouse.up();
  }
});

test('drag: the handle halves at once, the value indicator shows; no ring for a pointer', async ({
  page,
}) => {
  for (const group of ['element-sliders', 'react-sliders']) {
    const s = page.getByTestId(group).locator('.m3e-slider').nth(0);
    const track = await trackBox(s);
    await page.mouse.move(track.x + track.width * 0.4, track.y + track.height / 2);
    await page.mouse.down();
    await page.mouse.move(track.x + track.width * 0.7, track.y + track.height / 2, { steps: 4 });
    expect((await values(s))[0], group).toBeCloseTo(0.7, 1);
    await expect(s.locator('.m3e-slider__thumb')).toHaveAttribute('data-dragging', '');
    expect(await handleWidth(s), group).toBeCloseTo(2, 1);
    expect(await s.locator('.m3e-slider__handle').evaluate((el) => el.getAnimations().length)).toBe(
      0,
    );
    const indicator = s.locator('.m3e-slider__value-indicator');
    await expect(indicator).toBeVisible();
    await expect(indicator).toHaveText('0.7');
    const ib = await box(indicator);
    const hb = await box(s.locator('.m3e-slider__handle'));
    expect(ib.width).toBeCloseTo(48, 1);
    expect(ib.height).toBeCloseTo(44, 1);
    expect(hb.y - (ib.y + ib.height)).toBeCloseTo(12, 1);
    expect(
      await s.locator('.m3e-slider__handle').evaluate((el) => getComputedStyle(el).outlineStyle),
    ).toBe('none');
    if (group === 'element-sliders') {
      await expect(page).toHaveScreenshot('slider-dragging.png', {
        clip: {
          x: track.x - 32,
          y: track.y - 72,
          width: track.width + 64,
          height: track.height + 88,
        },
      });
    }
    await page.mouse.up();
    await expect(s.locator('.m3e-slider__thumb')).not.toHaveAttribute('data-dragging', '');
    await expect(indicator).toBeHidden();
    expect(await handleWidth(s)).toBeCloseTo(4, 1);
  }
});

test('focus: Tab to the handle rings it, halves it and shows the value; the gaps stay', async ({
  page,
}) => {
  const s = page.getByTestId('element-sliders').locator('.m3e-slider').nth(1);
  const before = await measure(s);
  await page.getByTestId('element-sliders').locator('input').first().focus();
  await page.keyboard.press('Tab');
  await expect(s.locator('input')).toBeFocused();
  const handle = s.locator('.m3e-slider__handle');
  expect(await handle.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('solid');
  expect(await handleWidth(s)).toBeCloseTo(2, 1);
  await expect(s.locator('.m3e-slider__value-indicator')).toHaveText('40');
  await expect(s.locator('.m3e-slider__value-indicator')).toBeVisible();
  // Owner decision M8 #23: the focus ring does not widen the gaps.
  expect((await measure(s)).parts).toEqual(before.parts);
  const track = await trackBox(s);
  await expect(page).toHaveScreenshot('slider-focused.png', {
    clip: { x: track.x - 32, y: track.y - 72, width: track.width + 64, height: track.height + 88 },
  });
  // Hover changes no color (owner decision M8 #3).
  const color = () => handle.evaluate((el) => getComputedStyle(el).backgroundColor);
  const rest = await color();
  await s.locator('.m3e-slider__thumb').hover();
  expect(await color()).toBe(rest);
});

test('vertical: the minimum at the bottom; up increases; a press at the top is the maximum', async ({
  page,
}) => {
  for (const s of [
    page.getByTestId('element-vertical').locator('.m3e-slider').first(),
    page.getByTestId('react-sliders').locator('.m3e-slider--vertical'),
  ]) {
    await expect(s.locator('input')).toHaveAttribute('aria-orientation', 'vertical');
    await expectGeometry(s, { values: [0.3], steps: 9 });
    await s.locator('input').focus();
    await page.keyboard.press('ArrowUp');
    expect(await values(s)).toEqual([40]);
    const track = await trackBox(s);
    await page.mouse.move(track.x + track.width / 2, track.y + 1);
    await page.mouse.down();
    await page.mouse.up();
    expect(await values(s)).toEqual([100]);
    await page.mouse.move(track.x + track.width / 2, track.y + track.height - 1);
    await page.mouse.down();
    await page.mouse.up();
    expect(await values(s)).toEqual([0]);
  }
});

test('RTL: the track and thumbs mirror; ArrowRight decreases (element)', async ({ page }) => {
  const host = page.getByTestId('element-sliders').locator('m3e-slider').nth(1);
  await host.evaluate((el) => {
    el.setAttribute('dir', 'rtl');
  });
  const s = host.locator('.m3e-slider');
  await expectGeometry(s, { values: [0.4], steps: 9 });
  const track = await trackBox(s);
  const thumb = await box(s.locator('.m3e-slider__thumb'));
  expect(track.x + track.width - (thumb.x + thumb.width / 2)).toBeCloseTo(
    (await measure(s)).thumbs[0]!,
    0,
  );
  await s.locator('input').focus();
  await page.keyboard.press('ArrowRight');
  expect(await values(s)).toEqual([30]);
  const statics = slider(page, 'static-range-stops');
  await statics.evaluate((el) => {
    el.setAttribute('dir', 'rtl');
  });
  await expectGeometry(statics, { values: [0.3, 0.7], steps: 9 });
});

test('disabled: no tab stop, no pointer or key changes, translucent tracks', async ({ page }) => {
  const s = slider(page, 'static-disabled');
  await expect(s.locator('input')).toBeDisabled();
  const colors = await s.evaluate((root) => ({
    active: getComputedStyle(root.querySelector('.m3e-slider__active')!).backgroundColor,
    handle: getComputedStyle(root.querySelector('.m3e-slider__handle')!).backgroundColor,
  }));
  expect(colors.handle).not.toMatch(/rgba|\/ 0?\.\d/);
  expect(colors.active).toMatch(/rgba|\/ 0?\.\d|color\(srgb [^)]* \/ /);
  await page.getByTestId('react-sliders').getByRole('checkbox').check();
  const r = page.getByTestId('react-sliders').locator('.m3e-slider').nth(1);
  const before = await values(r);
  const track = await trackBox(r);
  await page.mouse.click(track.x + track.width * 0.9, track.y + track.height / 2);
  expect(await values(r)).toEqual(before);
  await expect(r.locator('input')).not.toHaveAttribute('tabindex');
});

test.describe('forced colors', () => {
  test.use({ forcedColors: 'active' });

  test('track parts, ticks and the handle use visible system colors', async ({ page }) => {
    for (const id of ['static-stops', 'static-disabled']) {
      const style = await slider(page, id).evaluate((root) => {
        const bg = (sel: string) => getComputedStyle(root.querySelector(sel)!).backgroundColor;
        return {
          active: bg('.m3e-slider__active'),
          inactive: bg('.m3e-slider__inactive-end'),
          handle: bg('.m3e-slider__handle'),
        };
      });
      const transparent = /rgba\(0, 0, 0, 0\)|\/ 0\)/;
      for (const [k, v] of Object.entries(style)) expect(v, `${id} ${k}`).not.toMatch(transparent);
    }
  });

  test('GrayText only when disabled: an enabled inactive track is a CanvasText outline (M11 a11y L8)', async ({
    page,
  }) => {
    const system = (name: string) =>
      page.evaluate((c) => {
        const probe = document.createElement('div');
        probe.style.color = c;
        document.body.append(probe);
        const out = getComputedStyle(probe).color;
        probe.remove();
        return out;
      }, name);
    const [grayText, canvasText, canvas] = await Promise.all(
      ['GrayText', 'CanvasText', 'Canvas'].map(system),
    );
    const inactive = (id: string) =>
      slider(page, id)
        .locator('.m3e-slider__inactive-end')
        .evaluate((el) => {
          const s = getComputedStyle(el);
          return { fill: s.backgroundColor, outline: s.boxShadow };
        });
    const enabled = await inactive('static-stops');
    expect(enabled.fill).toBe(canvas);
    expect(enabled.fill).not.toBe(grayText);
    expect(enabled.outline).toContain(canvasText);
    const disabled = await inactive('static-disabled');
    expect(disabled.fill).toBe(grayText);
    expect(disabled.outline).toBe('none');
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('nothing animates: the handle and indicator change at once', async ({ page }) => {
    const s = page.getByTestId('element-sliders').locator('.m3e-slider').nth(0);
    await s.locator('input').focus();
    await page.keyboard.press('ArrowRight');
    expect(await s.evaluate((root) => root.getAnimations({ subtree: true }).length)).toBe(0);
  });
});
