// Reference comparisons for the window size classes: the generated tokens and the m3e-motion port
// against the vendored window-core and material3-adaptive sources, re-read with independent regexes.
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import {
  WINDOW_HEIGHT_BREAKPOINTS,
  WINDOW_WIDTH_BREAKPOINTS,
  navigationSuiteType,
  paneScaffoldDirective,
  windowSizeClass,
} from '@kyralabs/m3e-motion';
import { windowBreakpoints } from '@kyralabs/m3e-tokens';
import { describe, expect, it } from 'vitest';
import { generate } from './generate.js';
import { readGeneratorInputs } from './inputs.js';
import { readPin } from './pin.js';
import { readVendor } from './vendor.js';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const pin = readPin(root);
const output = generate(readGeneratorInputs(root, pin));
const vendor = (dir: string, name: string) => {
  const { manifest, files } = readVendor(join(root, 'packages/m3e-codegen/vendor', dir));
  expect(manifest.commit).toBe(pin['androidx_commit']);
  return files.find((f) => f.name === name)!.content;
};
const windowKt = vendor('androidx-window-core', 'WindowSizeClass.kt');
const helperKt = vendor('androidx-material3-adaptive', 'WindowSizeClassHelper.kt');
const infoKt = vendor('androidx-material3-adaptive', 'WindowAdaptiveInfo.kt');
const directiveKt = vendor('androidx-material3-adaptive', 'PaneScaffoldDirective.kt');
const suiteKt = vendor('androidx-material3-adaptive', 'NavigationSuiteScaffold.kt');
const constant = (name: string) =>
  Number(new RegExp(`const val ${name}: Int = (\\d+)`).exec(windowKt)![1]);

describe('window size class breakpoints (WindowSizeClass.kt)', () => {
  const kotlin = {
    width: {
      medium: constant('WIDTH_DP_MEDIUM_LOWER_BOUND'),
      expanded: constant('WIDTH_DP_EXPANDED_LOWER_BOUND'),
      large: constant('WIDTH_DP_LARGE_LOWER_BOUND'),
      'extra-large': constant('WIDTH_DP_EXTRA_LARGE_LOWER_BOUND'),
    },
    height: {
      medium: constant('HEIGHT_DP_MEDIUM_LOWER_BOUND'),
      expanded: constant('HEIGHT_DP_EXPANDED_LOWER_BOUND'),
    },
  };

  it('match FOUNDATIONS §9 and m3.material.io Breakpoints', () => {
    expect(kotlin).toEqual({
      width: { medium: 600, expanded: 840, large: 1200, 'extra-large': 1600 },
      height: { medium: 480, expanded: 900 },
    });
  });

  it('are emitted as --m3e-sys-window-* and the windowBreakpoints JS tokens', () => {
    const css = output.get('tokens.css')!;
    for (const axis of ['width', 'height'] as const) {
      for (const [sizeClass, dp] of Object.entries(kotlin[axis])) {
        expect(css).toContain(`--m3e-sys-window-${axis}-${sizeClass}: ${String(dp)}px;`);
      }
    }
    expect(windowBreakpoints).toEqual({
      width: { medium: 600, expanded: 840, large: 1200, extraLarge: 1600 },
      height: { medium: 480, expanded: 900 },
    });
  });

  it('are the ones the m3e-motion port classifies with', () => {
    expect(WINDOW_WIDTH_BREAKPOINTS).toEqual({ compact: 0, ...kotlin.width });
    expect(WINDOW_HEIGHT_BREAKPOINTS).toEqual({ compact: 0, ...kotlin.height });
  });
});

describe('material3-adaptive classification', () => {
  it('V2 adds Large and ExtraLarge to the default width set; heights stay V1', () => {
    expect(helperKt).toContain('val Default = setOf(Compact, Medium, Expanded)');
    expect(helperKt).toContain(
      'val DefaultV2 = setOf(Compact, Medium, Expanded, Large, ExtraLarge)',
    );
    expect(helperKt).toContain('supportedWidthSizeClasses.filter { windowSize.width >= it }');
    expect(helperKt).toContain('supportedHeightSizeClasses.filter { windowSize.height >= it }');
    expect(infoKt).toContain('currentWindowAdaptiveInfo(supportLargeAndXLargeWidth = true)');
  });
});

describe('the paneScaffoldDirective port (calculatePaneScaffoldDirective)', () => {
  it('uses the partition counts, spacers and preferred sizes PaneScaffoldDirective.kt declares', () => {
    const body = directiveKt.slice(
      directiveKt.indexOf('public fun calculatePaneScaffoldDirective('),
      directiveKt.indexOf('public fun calculatePaneScaffoldDirectiveWithTwoPanesOnMediumWidth('),
    );
    const branches = [
      ...body.matchAll(
        /maxHorizontalPartitions = (\d)\s+horizontalPartitionSpacerSize = (\d+)\.dp\s+defaultPanePreferredWidth = PaneScaffoldDirective\.(\w+)/g,
      ),
    ].map((m) => [Number(m[1]), Number(m[2]), m[3]]);
    expect(branches).toEqual([
      [1, 0, 'DefaultPreferredWidth'],
      [1, 0, 'DefaultPreferredWidth'],
      [2, 24, 'DefaultPreferredWidth'],
      [3, 24, 'DefaultPreferredWidthXL'],
    ]);
    expect(body).toContain(
      'maxVerticalPartitions = 2\n        verticalPartitionSpacerSize = 24.dp',
    );
    expect(directiveKt).toContain('internal val DefaultPreferredWidth = 360.dp');
    expect(directiveKt).toContain('internal val DefaultPreferredWidthXL = 412.dp');
    expect(directiveKt).toContain('internal val DefaultPreferredHeight = 420.dp');

    const at = (width: number, height: number) =>
      paneScaffoldDirective(windowSizeClass({ width, height }));
    const ported = [0, 600, 840, 1200].map((w) => [
      at(w, 800).maxHorizontalPartitions,
      at(w, 800).horizontalPartitionSpacerSize,
      at(w, 800).defaultPanePreferredWidth,
    ]);
    expect(ported).toEqual([
      [1, 0, 360],
      [1, 0, 360],
      [2, 24, 360],
      [3, 24, 412],
    ]);
    expect(at(0, 900).verticalPartitionSpacerSize).toBe(24);
    expect(at(0, 900).defaultPanePreferredHeight).toBe(420);
  });
});

describe('the navigationSuiteType port', () => {
  it('follows NavigationSuiteScaffoldDefaults.navigationSuiteType', () => {
    const body = suiteKt.slice(
      suiteKt.indexOf('public fun navigationSuiteType('),
      suiteKt.indexOf('public fun calculateFromAdaptiveInfo('),
    );
    const order = [...body.matchAll(/NavigationSuiteType\.(\w+)/g)].map((m) => m[1]);
    expect(order).toEqual([
      'ShortNavigationBarCompact',
      'ShortNavigationBarMedium',
      'WideNavigationRailCollapsed',
    ]);
    expect(body).toContain('windowSizeClass.minWidth == WindowSizeClass.WidthSizeClasses.Compact');
    expect(body).toContain(
      'windowSizeClass.minHeight == WindowSizeClass.HeightSizeClasses.Compact',
    );
    expect(navigationSuiteType(windowSizeClass({ width: 599, height: 1000 }))).toBe(
      'short-navigation-bar-compact',
    );
  });
});
