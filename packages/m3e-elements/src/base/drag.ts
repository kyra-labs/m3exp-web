// Pointer drags along one axis, shared by the components that drag to settle (the navigation
// drawer, the bottom sheets; later the side sheets and pull to refresh): the touch slop before a
// drag starts, the axis lock, pointer capture, the release velocity and the swallowed click that
// follows a drag. The caller maps the deltas onto its own model (m3e-motion's anchored draggable).
// Internal: not exported from an entry of its own.

/**
 * Pointer travel before a drag starts: Android's touch slop (8dp, ViewConfiguration), which
 * Compose's draggables read (SOURCES register #33).
 */
export const DRAG_SLOP = 8;
/**
 * Release velocity (an approximation of Compose's VelocityTracker1D, which fits the samples of the
 * last 100ms and drops everything before a 40ms pause, AssumePointerMoveStoppedMilliseconds):
 * the average speed over the trailing samples within that horizon, the release included.
 */
const VELOCITY_WINDOW = 100;
const VELOCITY_PAUSE = 40;

/** px/s over the trailing run of samples (newest last) without a pause, within the window. */
export function releaseVelocity(samples: readonly { t: number; x: number }[]): number {
  const last = samples.at(-1);
  if (!last) return 0;
  let first = last;
  for (let i = samples.length - 2; i >= 0; i--) {
    const s = samples[i];
    if (!s || first.t - s.t > VELOCITY_PAUSE || last.t - s.t > VELOCITY_WINDOW) break;
    first = s;
  }
  const dt = (last.t - first.t) / 1000;
  return dt > 0 ? (last.x - first.x) / dt : 0;
}

export interface PointerDragOptions {
  /** The drag axis: `x` (horizontal) or `y` (vertical). */
  readonly axis: 'x' | 'y';
  /**
   * A primary-button pointerdown on the root: return true to track it as a possible drag (the
   * caller checks its own state and the target).
   */
  readonly accept: (e: PointerEvent) => boolean;
  /**
   * The pointer passed the slop along the axis (it is captured from now on). `delta` is the
   * movement along the axis since the pointerdown; return false to let it go (e.g. the wrong
   * direction for this state).
   */
  readonly start: (e: PointerEvent, delta: number) => boolean;
  /** A move during the drag: `delta` px along the axis since the previous event. */
  readonly move: (delta: number, e: PointerEvent) => void;
  /** The drag ended: `velocity` px/s along the axis (0 when the pointer was cancelled). */
  readonly end: (velocity: number, e: PointerEvent) => void;
}

export interface PointerDrag {
  /** Lets the current pointer go without reporting an end. */
  cancel(): void;
  /** Stops tracking (and removes `data-dragging`). */
  destroy(): void;
}

/**
 * Tracks pointer drags on `root` along one axis. A movement across the axis first (past the slop)
 * lets the pointer go; along it, past the slop, the drag starts: the root captures the pointer,
 * gets `data-dragging` until the click the release produces has passed (and is swallowed: a drag
 * is not a click), and each move is reported as a delta. The release reports the velocity over
 * the trailing samples (VelocityTracker's horizon).
 */
export function pointerDrag(root: HTMLElement, options: PointerDragOptions): PointerDrag {
  const x = options.axis === 'x';
  const along = (e: PointerEvent) => (x ? e.clientX : e.clientY);
  const abort = new AbortController();
  let drag: {
    id: number;
    x: number;
    y: number;
    last: number;
    active: boolean;
    samples: { t: number; x: number }[];
    abort: AbortController;
  } | null = null;

  const endPointer = () => {
    const d = drag;
    drag = null;
    if (!d) return;
    d.abort.abort();
    if (root.hasPointerCapture(d.id)) root.releasePointerCapture(d.id);
  };

  const onMove = (e: PointerEvent) => {
    const d = drag;
    if (d?.id !== e.pointerId) return;
    const now = e.timeStamp || performance.now();
    const at = along(e);
    d.samples.push({ t: now, x: at });
    while (d.samples.length > 2 && now - (d.samples[0]?.t ?? now) > VELOCITY_WINDOW) {
      d.samples.shift();
    }
    if (!d.active) {
      const dx = Math.abs(e.clientX - d.x);
      const dy = Math.abs(e.clientY - d.y);
      const [on, across] = x ? [dx, dy] : [dy, dx];
      if (across > DRAG_SLOP && across > on) {
        endPointer();
        return;
      }
      if (on <= DRAG_SLOP || on < across) return;
      if (!options.start(e, at - (x ? d.x : d.y))) {
        endPointer();
        return;
      }
      d.active = true;
      // Until the release's click / press has passed: items ignore it (m3e-react's onPress).
      root.setAttribute('data-dragging', '');
      d.last = at;
      root.setPointerCapture(e.pointerId);
    }
    options.move(at - d.last, e);
    d.last = at;
    e.preventDefault();
  };

  const onUp = (e: PointerEvent) => {
    const d = drag;
    if (d?.id !== e.pointerId) return;
    endPointer();
    if (!d.active) return;
    // A drag is not a click: swallow the click that follows this pointerup (dispatched before
    // any timer), then stop listening.
    const guard = (click: Event) => {
      click.preventDefault();
      click.stopPropagation();
    };
    root.addEventListener('click', guard, { capture: true, once: true });
    setTimeout(() => {
      root.removeEventListener('click', guard, { capture: true });
      root.removeAttribute('data-dragging');
    }, 0);
    d.samples.push({ t: e.timeStamp || performance.now(), x: along(e) });
    options.end(e.type === 'pointercancel' ? 0 : releaseVelocity(d.samples), e);
  };

  root.addEventListener(
    'pointerdown',
    (e) => {
      if (e.button !== 0 || !options.accept(e)) return;
      // A new pointer replaces the one being tracked.
      endPointer();
      const signal = new AbortController();
      const at = along(e);
      drag = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        last: at,
        active: false,
        samples: [{ t: e.timeStamp || performance.now(), x: at }],
        abort: signal,
      };
      const opts = { signal: signal.signal };
      root.addEventListener('pointermove', onMove, opts);
      root.addEventListener('pointerup', onUp, opts);
      root.addEventListener('pointercancel', onUp, opts);
    },
    { signal: abort.signal },
  );

  return {
    cancel: endPointer,
    destroy() {
      endPointer();
      abort.abort();
      root.removeAttribute('data-dragging');
    },
  };
}
