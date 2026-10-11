/*
 * Copyright 2023 The Android Open Source Project
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
// Ported to TypeScript by Kyra Labs from commonMain/androidx/graphics/shapes/PolygonMeasure.kt@androidx.graphics:graphics-shapes:1.0.1 (sources jar)
//
// 1.0.1 measures outline progress by angle around the polygon center (AngleMeasurer);
// 1.1.0 switched to curve length.

import type { Cubic } from './cubic.js';
import { Corner, type Feature } from './features.js';
import type { RoundedPolygon } from './rounded-polygon.js';
import { DistanceEpsilon, TwoPi, angle, f, findMinimum, positiveModulo } from './utils.js';

/** A feature with its position along the outline of its polygon, in [0, 1). */
export class ProgressableFeature {
  constructor(
    readonly progress: number,
    readonly feature: Feature,
  ) {}
}

export interface Measurer {
  /**
   * Returns size of given cubic, according to however the implementation wants to measure the
   * size (angle, length, etc). It has to be greater or equal to 0.
   */
  measureCubic(c: Cubic): number;

  /**
   * Given a cubic and a measure that should be between 0 and the value returned by measureCubic
   * (If not, it will be capped), finds the parameter t of the cubic at which that measure is
   * reached.
   */
  findCubicCutPoint(c: Cubic, m: number): number;
}

/**
 * Approximates the arc lengths of cubics by measuring the angle swept around the center of the
 * polygon.
 */
export class AngleMeasurer implements Measurer {
  constructor(
    readonly centerX: number,
    readonly centerY: number,
  ) {}

  measureCubic(c: Cubic): number {
    const it = positiveModulo(
      f(
        angle(f(c.anchor1X - this.centerX), f(c.anchor1Y - this.centerY)) -
          angle(f(c.anchor0X - this.centerX), f(c.anchor0Y - this.centerY)),
      ),
      TwoPi,
    );
    // Avoid an empty cubic to measure almost TwoPi
    return it > f(TwoPi - DistanceEpsilon) ? 0 : it;
  }

  findCubicCutPoint(c: Cubic, m: number): number {
    const angle0 = angle(f(c.anchor0X - this.centerX), f(c.anchor0Y - this.centerY));
    return findMinimum(0, 1, f(1e-5), (t) => {
      const curvePoint = c.pointOnCurve(t);
      const a = angle(f(curvePoint.x - this.centerX), f(curvePoint.y - this.centerY));
      return Math.abs(f(positiveModulo(f(a - angle0), TwoPi) - m));
    });
  }
}

export class MeasuredCubic {
  readonly measuredSize: number;

  constructor(
    private readonly measurer: Measurer,
    readonly cubic: Cubic,
    private _startOutlineProgress: number,
    private _endOutlineProgress: number,
  ) {
    if (!(_endOutlineProgress >= _startOutlineProgress)) {
      throw new Error(
        'endOutlineProgress is expected to be equal or greater than startOutlineProgress',
      );
    }
    this.measuredSize = measurer.measureCubic(cubic);
  }

  get startOutlineProgress(): number {
    return this._startOutlineProgress;
  }

  get endOutlineProgress(): number {
    return this._endOutlineProgress;
  }

  updateProgressRange(
    startOutlineProgress: number = this._startOutlineProgress,
    endOutlineProgress: number = this._endOutlineProgress,
  ): void {
    if (!(endOutlineProgress >= startOutlineProgress)) {
      throw new Error(
        'endOutlineProgress is expected to be equal or greater than startOutlineProgress',
      );
    }
    this._startOutlineProgress = startOutlineProgress;
    this._endOutlineProgress = endOutlineProgress;
  }

  /**
   * Cut this MeasuredCubic into two MeasuredCubics at the given outline progress value.
   */
  cutAtProgress(cutOutlineProgress: number): [MeasuredCubic, MeasuredCubic] {
    // Floating point errors further up can cause cutOutlineProgress to land just
    // slightly outside of the start/end progress for this cubic, so we limit it
    // to those bounds to avoid further errors later
    const boundedCutOutlineProgress = Math.min(
      Math.max(cutOutlineProgress, this._startOutlineProgress),
      this._endOutlineProgress,
    );
    const outlineProgressSize = f(this._endOutlineProgress - this._startOutlineProgress);
    const progressFromStart = f(boundedCutOutlineProgress - this._startOutlineProgress);

    // Note that in earlier parts of the computation, we have empty MeasuredCubics (cubics
    // with progressSize == 0f), but those cubics are filtered out before this method is
    // called.
    const relativeProgress = f(progressFromStart / outlineProgressSize);
    const t = this.measurer.findCubicCutPoint(this.cubic, f(relativeProgress * this.measuredSize));
    if (!(t >= 0 && t <= 1)) throw new Error('Cubic cut point is expected to be between 0 and 1');

    // c1/c2 are the two new cubics, then we return MeasuredCubics created from them
    const [c1, c2] = this.cubic.split(t);
    return [
      new MeasuredCubic(this.measurer, c1, this._startOutlineProgress, boundedCutOutlineProgress),
      new MeasuredCubic(this.measurer, c2, boundedCutOutlineProgress, this._endOutlineProgress),
    ];
  }

  toString(): string {
    return `MeasuredCubic(outlineProgress=[${String(this._startOutlineProgress)} .. ${String(this._endOutlineProgress)}], size=${String(this.measuredSize)}, cubic=${String(this.cubic)})`;
  }
}

export class MeasuredPolygon implements Iterable<MeasuredCubic> {
  private readonly cubics: MeasuredCubic[];

  private constructor(
    private readonly measurer: Measurer,
    readonly features: readonly ProgressableFeature[],
    cubics: readonly Cubic[],
    outlineProgress: readonly number[],
  ) {
    if (outlineProgress.length !== cubics.length + 1) {
      throw new Error('Outline progress size is expected to be the cubics size + 1');
    }
    if (outlineProgress[0] !== 0)
      throw new Error('First outline progress value is expected to be zero');
    if (outlineProgress[outlineProgress.length - 1] !== 1) {
      throw new Error('Last outline progress value is expected to be one');
    }
    const measuredCubics: MeasuredCubic[] = [];
    let startOutlineProgress = 0;
    for (let index = 0; index < cubics.length; index++) {
      // Filter out "empty" cubics
      if (f(outlineProgress[index + 1]! - outlineProgress[index]!) > DistanceEpsilon) {
        measuredCubics.push(
          new MeasuredCubic(
            measurer,
            cubics[index]!,
            startOutlineProgress,
            outlineProgress[index + 1]!,
          ),
        );
        // The next measured cubic will start exactly where this one ends.
        startOutlineProgress = outlineProgress[index + 1]!;
      }
    }
    // We could have removed empty cubics at the end. Ensure the last measured cubic ends at 1f
    measuredCubics[measuredCubics.length - 1]!.updateProgressRange(undefined, 1);
    this.cubics = measuredCubics;
  }

  get size(): number {
    return this.cubics.length;
  }

  get(index: number): MeasuredCubic {
    const cubic = this.cubics[index];
    if (!cubic) throw new RangeError(`index ${String(index)} out of range`);
    return cubic;
  }

  [Symbol.iterator](): Iterator<MeasuredCubic> {
    return this.cubics[Symbol.iterator]();
  }

  /**
   * Finds the point in the input list of measured cubics that pass the given outline progress, and
   * generates a new MeasuredPolygon (equivalent to this), that starts at that point. This usually
   * means cutting the cubic that crosses the outline progress (unless the cut is at one of its
   * ends) For example, given outline progress 0.4f and measured cubics on these outline progress
   * ranges: c1 [0 -> 0.2] c2 [0.2 -> 0.5] c3 [0.5 -> 1.0] c2 will be cut in two, at the given
   * outline progress, we can name these c2a [0.2 -> 0.4] and c2b [0.4 -> 0.5] The return then will
   * have the following cubics, in this order: c2b, c3, c1, c2a
   */
  cutAndShift(cuttingPoint: number): MeasuredPolygon {
    if (!(cuttingPoint >= 0 && cuttingPoint <= 1)) {
      throw new Error('Cutting point is expected to be between 0 and 1');
    }
    if (cuttingPoint < DistanceEpsilon) return this;

    // Find the index of cubic we want to cut
    const targetIndex = this.cubics.findIndex(
      (it) => cuttingPoint >= it.startOutlineProgress && cuttingPoint <= it.endOutlineProgress,
    );
    const target = this.get(targetIndex);
    // Cut the target cubic.
    // b1, b2 are two resulting cubics after cut
    const [b1, b2] = target.cutAtProgress(cuttingPoint);

    // Construct the list of the cubics we need:
    // * The second part of the target cubic (after the cut)
    // * All cubics after the target, until the end + All cubics from the start, before the
    //   target cubic
    // * The first part of the target cubic (before the cut)
    const retCubics: Cubic[] = [b2.cubic];
    for (let i = 1; i < this.cubics.length; i++) {
      retCubics.push(this.get((i + targetIndex) % this.cubics.length).cubic);
    }
    retCubics.push(b1.cubic);

    // Construct the array of outline progress.
    // For example, if we have 3 cubics with outline progress [0 .. 0.3], [0.3 .. 0.8] &
    // [0.8 .. 1.0], and we cut + shift at 0.6:
    // 0.  0123456789
    //     |--|--/-|-|
    // The outline progresses will start at 0 (the cutting point, that shifs to 0.0),
    // then 0.8 - 0.6 = 0.2, then 1 - 0.6 = 0.4, then 0.3 - 0.6 + 1 = 0.7,
    // then 1 (the cutting point again),
    // all together: (0.0, 0.2, 0.4, 0.7, 1.0)
    const retOutlineProgress: number[] = [];
    for (let index = 0; index < this.cubics.length + 2; index++) {
      if (index === 0) retOutlineProgress.push(0);
      else if (index === this.cubics.length + 1) retOutlineProgress.push(1);
      else {
        const cubicIndex = (targetIndex + index - 1) % this.cubics.length;
        retOutlineProgress.push(
          positiveModulo(f(this.get(cubicIndex).endOutlineProgress - cuttingPoint), 1),
        );
      }
    }

    // Shift the feature outline progress too.
    const newFeatures = this.features.map(
      (it) => new ProgressableFeature(positiveModulo(f(it.progress - cuttingPoint), 1), it.feature),
    );

    // Filter out all empty cubics (i.e. start and end anchor are (almost) the same point.)
    return new MeasuredPolygon(this.measurer, newFeatures, retCubics, retOutlineProgress);
  }

  static measurePolygon(measurer: Measurer, polygon: RoundedPolygon): MeasuredPolygon {
    const cubics: Cubic[] = [];
    const featureToCubic: [Feature, number][] = [];

    // Get the cubics from the polygon, at the same time, extract the features and keep a
    // reference to the representative cubic we will use.
    for (const feature of polygon.features) {
      for (let cubicIndex = 0; cubicIndex < feature.cubics.length; cubicIndex++) {
        if (feature instanceof Corner && cubicIndex === Math.trunc(feature.cubics.length / 2)) {
          featureToCubic.push([feature, cubics.length]);
        }
        cubics.push(feature.cubics[cubicIndex]!);
      }
    }
    const measures: number[] = [0];
    for (const cubic of cubics) {
      const m = measurer.measureCubic(cubic);
      if (!(m >= 0)) throw new Error('Measured cubic is expected to be greater or equal to zero');
      measures.push(f(measures[measures.length - 1]! + m));
    }
    const totalMeasure = measures[measures.length - 1]!;
    const outlineProgress = measures.map((m) => f(m / totalMeasure));

    const features = featureToCubic.map(
      ([feature, ix]) =>
        new ProgressableFeature(f(f(outlineProgress[ix]! + outlineProgress[ix + 1]!) / 2), feature),
    );
    return new MeasuredPolygon(measurer, features, cubics, outlineProgress);
  }
}
