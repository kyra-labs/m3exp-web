// Pane expansion drag handle behavior (registers no element; COMPONENT_SPEC §16a): PaneScaffoldLayout
// attaches it (`options.expansion`) the first time a scaffold with a `.m3e-pane-scaffold__drag-handle`
// shows two expanded panes; the elements import this entry lazily then, m3e-react statically.
import {
  PANE_MOTION_VISIBILITY_THRESHOLD,
  SpringAnimatable,
  closestPaneExpansionAnchor,
  nextPaneExpansionAnchor,
  paneExpansionAnchorPosition,
} from '@kyralabs/m3e-motion';
import { readSpringTokens } from '../base/scroll.js';
import {
  PANE_SCAFFOLD_MOTION_TOKENS,
  type PaneExpansionValue,
  type PaneScaffoldLayout,
  type PaneScaffoldMeasure,
} from '../pane-scaffold-layout/pane-scaffold-layout.js';

/**
 * PaneExpansionState for a PaneScaffoldLayout's drag handle (PaneExpansionState.kt,
 * PaneExpansionDraggableModifier.kt @ 19991f2c):
 * - Dragging moves the split with the pointer (the handle's centre, clamped to the scaffold;
 *   at either edge one pane collapses). Each move writes the panes' bounds from the model layout
 *   measured when the drag started; nothing reads layout while it moves.
 * - Releasing settles on the closest anchor, or with a fling of at least 200 px/s on the closest
 *   one in its direction (settleToAnchorIfNeeded), on the pane motion spring with the release
 *   velocity (DefaultAnchoringAnimationSpec; jumps under reduced motion). Without anchors the
 *   split stays where it was released.
 * - Keyboard (web; Compose exposes only a click action to the next anchor): ArrowLeft /
 *   ArrowRight the previous / next anchor on screen, Home / End the start- / end-most, Enter /
 *   Space the next anchor (Compose's click action).
 * - A resting split follows the scaffold's width (re-rendered on resize).
 */
export function attachPaneExpansion(layout: PaneScaffoldLayout, signal: AbortSignal): void {
  const root = layout.root;
  let frame = 0;
  let settle: {
    spring: SpringAnimatable;
    key: string;
    value: PaneExpansionValue;
    m: PaneScaffoldMeasure;
  } | null = null;

  const draw = (m: PaneScaffoldMeasure, offset: number) => {
    layout.frame(layout.layout(m, layout.navigator.scaffoldValue, offset).panes, offset);
  };
  const done = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    settle = null;
    layout.dragging = false;
    layout.rest();
  };
  const tick = (now: number) => {
    if (!settle) return;
    const offset = settle.spring.sample(now);
    if (!settle.spring.isRunning) {
      layout.expansions.set(settle.key, settle.value);
      done();
      return;
    }
    draw(settle.m, offset);
    frame = requestAnimationFrame((t) => {
      tick(Math.max(t, performance.now()));
    });
  };
  const animateTo = (
    key: string,
    m: PaneScaffoldMeasure,
    from: number,
    index: number,
    velocity = 0,
  ) => {
    cancelAnimationFrame(frame);
    const anchor = layout.anchors[index];
    if (!anchor) {
      layout.expansions.set(key, { offset: from });
      done();
      return;
    }
    const spring = new SpringAnimatable(from, PANE_MOTION_VISIBILITY_THRESHOLD);
    const now = performance.now();
    spring.animateTo(
      paneExpansionAnchorPosition(anchor, m.width, m.rtl),
      readSpringTokens(getComputedStyle(root), PANE_SCAFFOLD_MOTION_TOKENS),
      now,
      velocity,
    );
    layout.dragging = true;
    settle = { spring, key, value: { anchor: index }, m };
    tick(now);
  };
  /** Where the handle is now (settling: its animated position). */
  const current = (m: PaneScaffoldMeasure) =>
    settle ? settle.spring.value : (layout.layout(m).handleOffset ?? 0);

  root.addEventListener(
    'pointerdown',
    (e) => {
      const handle = layout.handle;
      const key = layout.key();
      if (!handle || !key || e.button !== 0 || !handle.contains(e.target as Node)) return;
      e.preventDefault();
      const m = layout.measure();
      const left = root.getBoundingClientRect().left;
      let offset = current(m);
      let moved = false;
      const samples: [number, number][] = [[e.timeStamp, e.clientX]];
      cancelAnimationFrame(frame);
      settle = null;
      layout.dragging = true;
      handle.toggleAttribute('data-pressed', true);
      if ('setPointerCapture' in handle) handle.setPointerCapture(e.pointerId);
      handle.focus({ preventScroll: true });
      const move = (ev: PointerEvent) => {
        if (ev.pointerId !== e.pointerId) return;
        moved = true;
        offset = Math.min(Math.max(ev.clientX - left, 0), m.width);
        samples.push([ev.timeStamp, ev.clientX]);
        if (samples.length > 5) samples.shift();
        handle.toggleAttribute('data-dragged', true);
        draw(m, offset);
      };
      const up = (ev: PointerEvent) => {
        if (ev.pointerId !== e.pointerId) return;
        stop.abort();
        handle.removeAttribute('data-pressed');
        handle.removeAttribute('data-dragged');
        if (!moved) {
          done();
          return;
        }
        const [t0, x0] = samples[0] ?? [0, 0];
        const [t1, x1] = samples[samples.length - 1] ?? [0, 0];
        const velocity = t1 > t0 ? ((x1 - x0) / (t1 - t0)) * 1000 : 0;
        animateTo(
          key,
          m,
          offset,
          closestPaneExpansionAnchor(layout.anchors, m.width, offset, velocity, m.rtl),
          velocity,
        );
      };
      const stop = new AbortController();
      signal.addEventListener(
        'abort',
        () => {
          stop.abort();
        },
        { signal: stop.signal },
      );
      const opts = { signal: stop.signal };
      handle.addEventListener('pointermove', move, opts);
      handle.addEventListener('pointerup', up, opts);
      handle.addEventListener('pointercancel', up, opts);
    },
    { signal },
  );

  root.addEventListener(
    'keydown',
    (e) => {
      const key = layout.key();
      const anchors = layout.anchors;
      if (e.target !== layout.handle || !key || anchors.length === 0) return;
      const m = layout.measure();
      const offset = current(m);
      const sorted = anchors
        .map((a, index) => ({ at: paneExpansionAnchorPosition(a, m.width, m.rtl), index }))
        .sort((a, b) => a.at - b.at || a.index - b.index);
      const start = sorted[0]?.index ?? -1;
      const end = sorted[sorted.length - 1]?.index ?? -1;
      let index: number | undefined;
      switch (e.key) {
        case 'ArrowLeft':
          index = sorted.findLast((a) => a.at < offset)?.index;
          break;
        case 'ArrowRight':
          index = sorted.find((a) => a.at > offset)?.index;
          break;
        case 'Home':
          index = m.rtl ? end : start;
          break;
        case 'End':
          index = m.rtl ? start : end;
          break;
        case 'Enter':
        case ' ':
          index = nextPaneExpansionAnchor(anchors, m.width, offset, m.rtl);
          break;
        default:
          return;
      }
      e.preventDefault();
      if (index !== undefined) animateTo(key, m, offset, index);
    },
    { signal },
  );

  if (typeof ResizeObserver === 'function') {
    const observer = new ResizeObserver(() => {
      const key = layout.key();
      if (
        !layout.dragging &&
        key &&
        layout.expansions.has(key) &&
        !root.hasAttribute('data-animating')
      )
        layout.render();
    });
    observer.observe(root);
    signal.addEventListener('abort', () => {
      observer.disconnect();
    });
  }
}
