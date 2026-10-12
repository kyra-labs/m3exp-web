/*
 * Copyright 2024 The Android Open Source Project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
// Ported to TypeScript by Kyra Labs from compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/LoadingIndicator.kt@19991f2c0858aadfcb442ce02b2c8e4743c96898
//
// The geometry of Compose's LoadingIndicator, float32-faithful: the default polygon lists
// (LoadingIndicatorDefaults), morphSequence, calculateScaleFactor, processPath, and the
// determinate draw step of LoadingIndicatorImpl. Timing (the indeterminate morph spring and the
// global rotation) is in @kyralabs/m3e-motion; its values are generated tokens.

import { Morph } from './graphics-shapes/morph.js';
import type { RoundedPolygon } from './graphics-shapes/rounded-polygon.js';
import { f } from './graphics-shapes/utils.js';
import { type MaterialShapeName, materialShape } from './material-shapes.js';
import { Matrix } from './matrix.js';
import { type PathCommand, pathBounds, toSvgPathData, transformPath } from './path.js';
import { morphToPath, transformedByMatrix } from './shape-util.js';

const INDETERMINATE: readonly MaterialShapeName[] = [
  'SoftBurst',
  'Cookie9Sided',
  'Pentagon',
  'Pill',
  'Sunny',
  'Cookie4Sided',
  'Oval',
];

/**
 * `LoadingIndicatorDefaults.IndeterminateIndicatorPolygons`: the seven shapes the indeterminate
 * indicator morphs between, in order.
 */
export const indeterminateIndicatorPolygons = (): RoundedPolygon[] =>
  INDETERMINATE.map(materialShape);

/**
 * `LoadingIndicatorDefaults.DeterminateIndicatorPolygons`: a circle rotated by 360° / 20 (for a
 * smoother morph into the soft burst, which is rotated by the same angle) and the soft burst.
 */
export const determinateIndicatorPolygons = (): RoundedPolygon[] => [
  transformedByMatrix(materialShape('Circle'), new Matrix().rotateZ(f(360 / 20))),
  materialShape('SoftBurst'),
];

/**
 * A morph between each consecutive pair of polygons (each normalized) and, when
 * [circularSequence], a final morph from the last back to the first.
 */
export function morphSequence(
  polygons: readonly RoundedPolygon[],
  circularSequence: boolean,
): Morph[] {
  const morphs: Morph[] = [];
  for (let i = 0; i < polygons.length; i++) {
    if (i + 1 < polygons.length) {
      morphs.push(new Morph(polygons[i]!.normalized(), polygons[i + 1]!.normalized()));
    } else if (circularSequence) {
      // Create a morph from the last shape to the first shape
      morphs.push(new Morph(polygons[i]!.normalized(), polygons[0]!.normalized()));
    }
  }
  return morphs;
}

/**
 * The scale factor that keeps every polygon inside its box while it rotates: the smallest
 * bounds-to-max-bounds ratio (using the larger of the x and y ratios, for pill-like shapes).
 */
export function calculateScaleFactor(polygons: readonly RoundedPolygon[]): number {
  let scaleFactor = 1;
  const bounds = [0, 0, 0, 0];
  const maxBounds = [0, 0, 0, 0];
  for (const polygon of polygons) {
    polygon.calculateBounds(bounds);
    polygon.calculateMaxBounds(maxBounds);
    const scaleX = f(f(bounds[2]! - bounds[0]!) / f(maxBounds[2]! - maxBounds[0]!));
    const scaleY = f(f(bounds[3]! - bounds[1]!) / f(maxBounds[3]! - maxBounds[1]!));
    // We use max(scaleX, scaleY) to handle cases like a pill-shape that can throw off the
    // entire calculation.
    scaleFactor = Math.min(scaleFactor, Math.max(scaleX, scaleY));
  }
  return scaleFactor;
}

/**
 * Scales a normalized path by `size × scaleFactor` and centers it (by its control-point bounds)
 * in a `width` x `height` box.
 */
export function processPath(
  path: readonly PathCommand[],
  width: number,
  height: number,
  scaleFactor: number,
): PathCommand[] {
  // Scale to the desired size.
  const scaled = transformPath(
    path,
    new Matrix().scale(f(width * scaleFactor), f(height * scaleFactor)),
  );
  // Translate the path to align its center with the available size center.
  const [left, top, right, bottom] = pathBounds(scaled);
  const dx = f(f(width / 2) - f(left + f(f(right - left) / 2)));
  const dy = f(f(height / 2) - f(top + f(f(bottom - top) / 2)));
  return scaled.map((command): PathCommand => {
    switch (command[0]) {
      case 'M':
      case 'L':
        return [command[0], f(command[1] + dx), f(command[2] + dy)];
      case 'C':
        return [
          'C',
          f(command[1] + dx),
          f(command[2] + dy),
          f(command[3] + dx),
          f(command[4] + dy),
          f(command[5] + dx),
          f(command[6] + dy),
        ];
      case 'Z':
        return command;
    }
  });
}

/** What the indicator draws in one frame: a morph at a progress, rotated about the center. */
export interface LoadingIndicatorFrame {
  morphIndex: number;
  morphProgress: number;
  /** Degrees, clockwise. */
  rotation: number;
}

/**
 * The determinate draw step: picks the active morph for [progress] (coerced to 0..1), its local
 * progress, and rotates counterclockwise by half a turn over the whole range.
 */
export function determinateFrame(progress: number, morphCount: number): LoadingIndicatorFrame {
  const value = Number.isNaN(progress) ? 0 : Math.min(Math.max(f(progress), 0), 1);
  const scaled = f(morphCount * value);
  // Adjust the active morph index according to the progress.
  const morphIndex = Math.min(Math.trunc(scaled), morphCount - 1);
  // Prevents a zero when the progress is one and we are at the last shape morph.
  const morphProgress = value === 1 && morphIndex === morphCount - 1 ? 1 : scaled % 1;
  // Rotate counterclockwise.
  return { morphIndex, morphProgress, rotation: f(-value * 180) };
}

/**
 * A loading indicator's shapes, prepared once: the morph sequence and the scale factor
 * (`calculateScaleFactor × activeIndicatorScale`, where the active indicator scale is the token
 * ratio `ActiveSize / min(ContainerWidth, ContainerHeight)`).
 */
export class LoadingIndicatorShapes {
  readonly morphs: readonly Morph[];
  readonly scaleFactor: number;

  constructor(
    polygons: readonly RoundedPolygon[],
    circularSequence: boolean,
    activeIndicatorScale: number,
  ) {
    if (polygons.length < 2) {
      throw new Error('indicatorPolygons should have, at least, two RoundedPolygons');
    }
    this.morphs = morphSequence(polygons, circularSequence);
    this.scaleFactor = f(calculateScaleFactor(polygons) * f(activeIndicatorScale));
  }

  /** The processed path of morph [morphIndex] at [progress] in a [size]-sided square. */
  path(morphIndex: number, progress: number, size: number): PathCommand[] {
    const morph = this.morphs[morphIndex]!;
    return processPath(
      morphToPath(morph, progress, { startAngle: 0 }),
      size,
      size,
      this.scaleFactor,
    );
  }

  /** {@link path} as an SVG `d` attribute. */
  pathData(morphIndex: number, progress: number, size: number): string {
    return toSvgPathData(this.path(morphIndex, progress, size));
  }
}

const defaultShapes = new Map<string, LoadingIndicatorShapes>();
const customShapes = new WeakMap<readonly RoundedPolygon[], Map<string, LoadingIndicatorShapes>>();

/**
 * {@link LoadingIndicatorShapes} for an indicator, built once per polygon list (null = the
 * Compose defaults for the kind), kind and active indicator scale. Morph construction is the
 * expensive part, so every indicator on a page shares it.
 */
export function loadingIndicatorShapes(
  polygons: readonly RoundedPolygon[] | null,
  indeterminate: boolean,
  activeIndicatorScale: number,
): LoadingIndicatorShapes {
  const key = `${String(indeterminate)}:${String(activeIndicatorScale)}`;
  let cache = defaultShapes;
  if (polygons) {
    cache = customShapes.get(polygons) ?? new Map<string, LoadingIndicatorShapes>();
    customShapes.set(polygons, cache);
  }
  let shapes = cache.get(key);
  if (!shapes) {
    const list =
      polygons ??
      (indeterminate ? indeterminateIndicatorPolygons() : determinateIndicatorPolygons());
    shapes = new LoadingIndicatorShapes(list, indeterminate, activeIndicatorScale);
    cache.set(key, shapes);
  }
  return shapes;
}
