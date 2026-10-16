/**
 * Pointer/keyboard tracking for the state-layer ripple (m3e-css state-layer.css, REQUIREMENTS §12).
 * Sets on the host:
 * - `data-ripple` (a press grows a circle from the press point; hover and focus stay flat),
 * - `data-pressed` while pressed,
 * - `--_m3e-ripple-x`, `--_m3e-ripple-y`: the press point (center for keyboard presses),
 * - `--_m3e-ripple-radius`: distance from the press point to the farthest corner.
 * m3e-react's `useStateLayer` writes the same attributes, so both layers render one DOM contract.
 * The `ripple.js` entry (`attachAutoRipple`) reuses the press helpers below for plain HTML.
 */

/** Ripple geometry for a press at (`x`, `y`) inside a `width` × `height` box (keyboard: null). */
export function rippleStyle(
  width: number,
  height: number,
  point: { x: number; y: number } | null,
): Record<'--_m3e-ripple-x' | '--_m3e-ripple-y' | '--_m3e-ripple-radius', string> {
  const x = point ? point.x : width / 2;
  const y = point ? point.y : height / 2;
  const radius = Math.hypot(Math.max(x, width - x), Math.max(y, height - y));
  const px = (v: number) => `${String(Math.round(v * 100) / 100)}px`;
  return { '--_m3e-ripple-x': px(x), '--_m3e-ripple-y': px(y), '--_m3e-ripple-radius': px(radius) };
}

/** Keys that press a button (Enter and Space). */
export const PRESS_KEYS: ReadonlySet<string> = new Set(['Enter', ' ']);

/** `:disabled` or `aria-disabled="true"`: m3e-css draws no state layer, so presses are ignored. */
export function isRippleDisabled(el: Element): boolean {
  return el.matches(':disabled') || el.getAttribute('aria-disabled') === 'true';
}

/**
 * Starts a press on `host`: writes the ripple geometry for the client-space `point` (null:
 * keyboard, from the center) and `data-pressed`.
 */
export function pressRipple(host: HTMLElement, point: { x: number; y: number } | null): void {
  const box = host.getBoundingClientRect();
  const local = point ? { x: point.x - box.left, y: point.y - box.top } : null;
  for (const [name, value] of Object.entries(rippleStyle(box.width, box.height, local))) {
    host.style.setProperty(name, value);
  }
  host.setAttribute('data-pressed', '');
}

/** Ends a press on `host`. */
export function releaseRipple(host: HTMLElement): void {
  host.removeAttribute('data-pressed');
}

/**
 * Tracks presses on `host` until `signal` aborts. Disabled hosts (`:disabled`,
 * `aria-disabled="true"`) are ignored. A `trigger` takes the presses for a host that only draws
 * them (a navigation item's indicator pill, as m3e-react's `useStateLayer(hostRef)`); links press
 * on Enter only, since Space does not activate them.
 */
export function attachRipple(
  host: HTMLElement,
  signal: AbortSignal,
  trigger: HTMLElement = host,
): void {
  host.setAttribute('data-ripple', '');
  const keys = trigger.matches('a[href], [role="link"]') ? new Set(['Enter']) : PRESS_KEYS;
  const press = (point: { x: number; y: number } | null) => {
    if (!isRippleDisabled(host) && !isRippleDisabled(trigger)) pressRipple(host, point);
  };
  const release = () => {
    releaseRipple(host);
  };
  const options = { signal };
  trigger.addEventListener(
    'pointerdown',
    (e) => {
      if (e.button === 0) press({ x: e.clientX, y: e.clientY });
    },
    options,
  );
  for (const type of ['pointerup', 'pointercancel', 'pointerleave', 'blur'] as const) {
    trigger.addEventListener(type, release, options);
  }
  trigger.addEventListener(
    'keydown',
    (e) => {
      if (keys.has(e.key) && !e.repeat) press(null);
    },
    options,
  );
  trigger.addEventListener(
    'keyup',
    (e) => {
      if (keys.has(e.key)) release();
    },
    options,
  );
  signal.addEventListener('abort', () => {
    release();
    host.removeAttribute('data-ripple');
  });
}
