// Source fidelity of the pull-to-refresh port (COMPONENT_SPEC §38), checked against the vendored
// pulltorefresh/PullToRefresh.kt@19991f2c: the JVM reference harness copies the node's drag
// bookkeeping and the arrow's drawing verbatim, and the TypeScript port uses the same constants.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const read = (path: string) => readFileSync(`${root}${path}`, 'utf8').replace(/\r\n/g, '\n');
const vendored = read('packages/m3e-codegen/vendor/androidx-material3-sources/PullToRefresh.kt');
const harness = read('packages/m3e-motion/reference-pull-to-refresh/PullToRefreshReference.kt');
const port = read('packages/m3e-motion/src/pull-to-refresh.ts');
const unindent = (text: string) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .join('\n');

describe('pull-to-refresh JVM harness', () => {
  it('copies every VERBATIM block unchanged from the vendored PullToRefresh.kt', () => {
    const blocks = [
      ...harness.matchAll(/\/\/ BEGIN VERBATIM ([^\n]+)\n([\s\S]*?)\n\s*\/\/ END VERBATIM/g),
    ];
    expect(blocks.map((b) => b[1])).toEqual([
      'adjustedDistancePulled, thresholdPx, progress',
      'consumeAvailableOffset',
      'onRelease',
      'calculateVerticalOffset',
      'animateToThreshold, animateToHidden',
      'CircularArrowProgressIndicator canvas',
      'drawCircularIndicator',
      'ArrowValues',
      'drawArrow',
      'arrow constants',
      'alpha and drag constants',
    ]);
    for (const [, name, body] of blocks) {
      expect(unindent(vendored), name).toContain(unindent(body!));
    }
  });
});

describe('pull-to-refresh port', () => {
  const constant = (pattern: RegExp) => pattern.exec(vendored)?.[1];

  it('uses the private constants of PullToRefresh.kt', () => {
    expect(constant(/private const val DragMultiplier = ([\d.]+)f/)).toBe('0.5');
    expect(port).toContain('PULL_TO_REFRESH_DRAG_MULTIPLIER = 0.5;');
    expect(constant(/private const val MinAlpha = ([\d.]+)f/)).toBe('0.3');
    expect(port).toContain('PULL_TO_REFRESH_MIN_ALPHA = f(0.3);');
    expect(constant(/private const val MaxProgressArc = ([\d.]+)f/)).toBe('0.8');
    expect(port).toContain('MAX_PROGRESS_ARC = f(0.8);');
    expect(constant(/private val StrokeWidth\n\s*get\(\) = ([\d.]+)\.dp/)).toBe('2.5');
    expect(port).toContain('STROKE_WIDTH = 2.5;');
    expect(constant(/private val ArcRadius\n\s*get\(\) = ([\d.]+)\.dp/)).toBe('5.5');
    expect(port).toContain('ARC_RADIUS = 5.5;');
    expect(constant(/private val ArrowWidth\n\s*get\(\) = (\d+)\.dp/)).toBe('10');
    expect(port).toContain('ARROW_WIDTH = 10;');
    expect(constant(/private val ArrowHeight\n\s*get\(\) = (\d+)\.dp/)).toBe('5');
    expect(port).toContain('ARROW_HEIGHT = 5;');
    expect(constant(/internal val SpinnerSize = (\d+)\.dp/)).toBe('16');
    expect(port).toContain('PULL_TO_REFRESH_SPINNER_SIZE = 16;');
  });

  it('snaps the state to verticalOffset / thresholdPx after a drag', () => {
    expect(vendored).toContain('state.snapTo(verticalOffset / thresholdPx)');
    expect(port).toContain('f(this.verticalOffset / this.thresholdPx)');
  });

  it('moves the indicator box by distanceFraction × maxDistance − its height', () => {
    expect(unindent(vendored)).toContain(
      unindent(`translationY =
                                        state.distanceFraction * maxDistance.roundToPx() -
                                            size.height`),
    );
  });

  it('rotates the loading indicator by -(progress - 1) × 180 past the threshold', () => {
    expect(vendored).toContain('if (progress > 1f) {');
    expect(vendored).toContain('rotate(-(progress - 1) * 180) {');
  });
});
