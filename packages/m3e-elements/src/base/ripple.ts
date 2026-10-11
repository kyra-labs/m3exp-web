/**
 * Pointer/keyboard tracking for the state-layer ripple (m3e-css state-layer.css, REQUIREMENTS §12).
 * Sets on the host:
 * - `data-ripple` (the overlay grows as a circle instead of fading in flat),
 * - `data-pressed` while pressed,
 * - `--_m3e-ripple-x`, `--_m3e-ripple-y`: the press point (center for keyboard presses),
 * - `--_m3e-ripple-radius`: distance from the press point to the farthest corner.
 * m3e-react's `useStateLayer` writes the same attributes, so both layers render one DOM contract.
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

const PRESS_KEYS = new Set(['Enter', ' ']);

/**
 * Tracks presses on `host` until `signal` aborts. Disabled hosts (`:disabled`,
 * `aria-disabled="true"`) are ignored.
 */
export function attachRipple(host: HTMLElement, signal: AbortSignal): void {
  host.setAttribute('data-ripple', '');
  const disabled = () => host.matches(':disabled') || host.getAttribute('aria-disabled') === 'true';
  const press = (point: { x: number; y: number } | null) => {
    if (disabled()) return;
    const box = host.getBoundingClientRect();
    const local = point ? { x: point.x - box.left, y: point.y - box.top } : null;
    for (const [name, value] of Object.entries(rippleStyle(box.width, box.height, local))) {
      host.style.setProperty(name, value);
    }
    host.setAttribute('data-pressed', '');
  };
  const release = () => {
    host.removeAttribute('data-pressed');
  };
  const options = { signal };
  host.addEventListener(
    'pointerdown',
    (e) => {
      if (e.button === 0) press({ x: e.clientX, y: e.clientY });
    },
    options,
  );
  for (const type of ['pointerup', 'pointercancel', 'pointerleave', 'blur'] as const) {
    host.addEventListener(type, release, options);
  }
  host.addEventListener(
    'keydown',
    (e) => {
      if (PRESS_KEYS.has(e.key) && !e.repeat) press(null);
    },
    options,
  );
  host.addEventListener(
    'keyup',
    (e) => {
      if (PRESS_KEYS.has(e.key)) release();
    },
    options,
  );
  signal.addEventListener('abort', () => {
    release();
    host.removeAttribute('data-ripple');
  });
}
