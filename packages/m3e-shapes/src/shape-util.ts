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
// Ported to TypeScript by Kyra Labs from compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/internal/ShapeUtil.kt@19991f2c0858aadfcb442ce02b2c8e4743c96898

import type { Cubic } from './graphics-shapes/cubic.js';
import type { Morph } from './graphics-shapes/morph.js';
import type { RoundedPolygon } from './graphics-shapes/rounded-polygon.js';
import { Matrix } from './matrix.js';
import { type PathCommand, transformPath } from './path.js';

/** Transforms a [RoundedPolygon] with the given [Matrix]. */
export const transformedByMatrix = (polygon: RoundedPolygon, matrix: Matrix): RoundedPolygon =>
  polygon.transformed((x, y) => matrix.map(x, y));

export interface PathOptions {
  /**
   * Angle in degrees the path starts drawing from. Note that, as in Compose, the path is rotated
   * around the origin; the pivot only measures the angle of the first anchor.
   */
  startAngle?: number;
  /** Draws the outline twice (for stroke animations). */
  repeatPath?: boolean;
  /** Closes the path. */
  closePath?: boolean;
}

// Defaults follow the public wrappers in MaterialShapes.kt (`startAngle = 0`: start at 3 o'clock);
// the internal ShapeUtil functions default to 270 (12 o'clock).

/** Path for a [RoundedPolygon]; the start angle is measured around its center. */
export function polygonToPath(polygon: RoundedPolygon, options: PathOptions = {}): PathCommand[] {
  const { startAngle = 0, repeatPath = false, closePath = true } = options;
  return pathFromCubics(
    startAngle,
    repeatPath,
    closePath,
    polygon.cubics,
    polygon.centerX,
    polygon.centerY,
  );
}

export interface MorphPathOptions extends PathOptions {
  rotationPivotX?: number;
  rotationPivotY?: number;
}

/** Path for a [Morph] at [progress]; the start angle is measured around the rotation pivot. */
export function morphToPath(
  morph: Morph,
  progress: number,
  options: MorphPathOptions = {},
): PathCommand[] {
  const {
    startAngle = 0,
    repeatPath = false,
    closePath = true,
    rotationPivotX = 0,
    rotationPivotY = 0,
  } = options;
  return pathFromCubics(
    startAngle,
    repeatPath,
    closePath,
    morph.asCubics(progress),
    rotationPivotX,
    rotationPivotY,
  );
}

function pathFromCubics(
  startAngle: number,
  repeatPath: boolean,
  closePath: boolean,
  cubics: readonly Cubic[],
  rotationPivotX: number,
  rotationPivotY: number,
): PathCommand[] {
  const path: PathCommand[] = [];
  const first = cubics[0];
  if (first !== undefined) path.push(['M', first.anchor0X, first.anchor0Y]);
  const addCubics = () => {
    for (const it of cubics) {
      path.push([
        'C',
        it.control0X,
        it.control0Y,
        it.control1X,
        it.control1Y,
        it.anchor1X,
        it.anchor1Y,
      ]);
    }
  };
  addCubics();
  if (repeatPath && first !== undefined) {
    path.push(['L', first.anchor0X, first.anchor0Y]);
    addCubics();
  }

  if (closePath) path.push(['Z']);

  if (startAngle !== 0 && first !== undefined) {
    const f = Math.fround;
    const angleToFirstCubic = radiansToDegrees(
      f(Math.atan2(f(first.anchor0Y - rotationPivotY), f(first.anchor0X - rotationPivotX))),
    );
    // Rotate the Path to to start from the given angle.
    return transformPath(path, new Matrix().rotateZ(f(-angleToFirstCubic + startAngle)));
  }
  return path;
}

const radiansToDegrees = (radians: number): number => Math.fround((radians * 180) / Math.PI);
