import { PRESS_KEYS, isRippleDisabled, pressRipple, releaseRipple } from '../base/ripple.js';

/**
 * Press targets m3e-css draws a ripple for: the hosts in the state-layer.css `:where()` lists,
 * plus the two proxies (an interactive card's `.m3e-card__action`, a `.m3e-navigation-item`).
 */
const TRIGGERS =
  '.m3e-button,.m3e-icon-button,.m3e-assist-chip,.m3e-state-layer,.m3e-card__action,.m3e-navigation-item';

/** Pointer id of a keyboard press (real pointer ids are never negative). */
const KEYBOARD = -1;

interface Press {
  trigger: Element;
  host: HTMLElement;
}

/**
 * The element that draws the ripple for a press on `trigger`. Cards and navigation items take the
 * press on one element and draw the state layer on another, as m3e-react's
 * `useStateLayer(hostRef)` does: the card for `.m3e-card__action`, the indicator pill
 * (`.m3e-navigation-item__state`) for a navigation item.
 */
function rippleHost(trigger: Element): HTMLElement | null {
  if (trigger.matches('.m3e-card__action')) {
    return trigger.closest<HTMLElement>('.m3e-card--interactive');
  }
  if (trigger.matches('.m3e-navigation-item')) {
    return trigger.querySelector<HTMLElement>('.m3e-navigation-item__state');
  }
  return trigger as HTMLElement;
}

/**
 * Press ripple for plain-HTML m3e-css components (no per-element wiring): one delegated set of
 * pointer and keyboard listeners on `root`, so components added later work too. A press writes the
 * m3e-css ripple contract on the host (`data-ripple`, `data-pressed`, `--_m3e-ripple-x/-y/-radius`,
 * via the same helpers as `attachRipple`) and removes `data-ripple` again on release, so hover and
 * focus overlays keep their flat shape between presses.
 *
 * - Skipped: hosts that already carry `data-ripple` when the press starts. m3e-react's
 *   `useStateLayer` renders it on every host it drives and `attachRipple` sets it on attach, so
 *   React components and elements that track their own presses are never handled twice.
 * - Disabled triggers or hosts (`:disabled`, `aria-disabled="true"`) are ignored.
 * - Keyboard: Enter and Space on the focused trigger press from the center, like `attachRipple`;
 *   links (`a[href]`, `role="link"`) only press on Enter, since Space does not activate them.
 * - Reduced motion and forced colors are handled by m3e-css (motion tokens, hidden overlay).
 *
 * Runs until `signal` aborts. `import '@kyralabs/m3e-elements/ripple.js'` calls it for the
 * document.
 */
export function attachAutoRipple(
  root: Document | ShadowRoot | HTMLElement,
  signal: AbortSignal,
): void {
  const presses = new Map<number, Press>();

  const start = (id: number, trigger: Element, point: { x: number; y: number } | null) => {
    const host = rippleHost(trigger);
    if (!host || presses.has(id) || host.hasAttribute('data-ripple')) return;
    if (isRippleDisabled(trigger) || isRippleDisabled(host)) return;
    host.setAttribute('data-ripple', '');
    pressRipple(host, point);
    presses.set(id, { trigger, host });
  };
  const end = (id: number) => {
    const press = presses.get(id);
    if (!press) return;
    presses.delete(id);
    releaseRipple(press.host);
    press.host.removeAttribute('data-ripple');
  };

  const options = { capture: true, signal };
  root.addEventListener(
    'pointerdown',
    (e: Event) => {
      const event = e as PointerEvent;
      if (event.button !== 0) return;
      for (const node of event.composedPath()) {
        if (node instanceof Element && node.matches(TRIGGERS)) {
          start(event.pointerId, node, { x: event.clientX, y: event.clientY });
          return;
        }
        if (node === root) return;
      }
    },
    options,
  );
  for (const type of ['pointerup', 'pointercancel'] as const) {
    root.addEventListener(
      type,
      (e: Event) => {
        end((e as PointerEvent).pointerId);
      },
      options,
    );
  }
  // pointerleave does not bubble: end the press when the pointer moves out of the trigger.
  root.addEventListener(
    'pointerout',
    (e: Event) => {
      const event = e as PointerEvent;
      const press = presses.get(event.pointerId);
      const to = event.relatedTarget;
      if (press && !(to instanceof Node && press.trigger.contains(to))) end(event.pointerId);
    },
    options,
  );
  root.addEventListener(
    'keydown',
    (e: Event) => {
      const event = e as KeyboardEvent;
      if (!PRESS_KEYS.has(event.key) || event.repeat) return;
      const target = event.composedPath()[0];
      if (!(target instanceof Element) || !target.matches(TRIGGERS)) return;
      if (event.key === ' ' && target.matches('a[href],[role="link"]')) return;
      start(KEYBOARD, target, null);
    },
    options,
  );
  root.addEventListener(
    'keyup',
    (e: Event) => {
      if (PRESS_KEYS.has((e as KeyboardEvent).key)) end(KEYBOARD);
    },
    options,
  );
  root.addEventListener(
    'focusout',
    () => {
      end(KEYBOARD);
    },
    options,
  );
  signal.addEventListener('abort', () => {
    for (const id of [...presses.keys()]) end(id);
  });
}
