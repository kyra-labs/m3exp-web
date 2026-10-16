/*
 * Copyright 2025 The Android Open Source Project
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
// Ported to TypeScript by Kyra Labs from compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/internal/LinearWavyProgressModifiers.kt@19991f2c0858aadfcb442ce02b2c8e4743c96898
// Ported to TypeScript by Kyra Labs from compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/internal/CircularWavyProgressModifiers.kt@19991f2c0858aadfcb442ce02b2c8e4743c96898
//
// The paths the wavy progress indicators draw (shared by m3e-elements and m3e-react), in pixels:
// - linear (LinearProgressDrawingCache): a quadratic wave at full amplitude, a couple of
//   wavelengths longer than the indicator, measured once; each progress part is a segment of it by
//   arc length (shifted by the wave offset), flattened to the amplitude; the track runs from the
//   end back to the start, around the parts with the gap; plus the stop indicator;
// - circular (CircularShapes + CircularProgressDrawingCache): a circle polygon (the track) and a
//   star with as many points as wavelengths fit the circumference (the wave), morphed by the
//   amplitude; the progress is a segment of it by arc length (the path is repeated so a wave
//   offset can shift the segment, which is then rotated back) and the track the rest of the circle
//   after the gap.

import { CornerRounding } from './graphics-shapes/corner-rounding.js';
import { Morph } from './graphics-shapes/morph.js';
import type { RoundedPolygon } from './graphics-shapes/rounded-polygon.js';
import { circle, star } from './graphics-shapes/shapes.js';
import { type PathCommand, pathBounds, transformPath, translatePath } from './path.js';
import { PathMeasure } from './path-measure.js';
import { Matrix } from './matrix.js';
import { morphToPath, polygonToPath } from './shape-util.js';

/** Stroke widths (px) and whether the caps are round (StrokeCap.Round, the default). */
export interface ProgressStrokes {
  stroke: number;
  trackStroke: number;
  round?: boolean;
}

/** `currentStrokeCapWidth`: room the round caps need at each end (0 for butt caps or h > w). */
const capWidth = (s: ProgressStrokes, width: number, height: number) =>
  s.round === false || height > width ? 0 : Math.max(s.stroke / 2, s.trackStroke / 2);

export interface LinearWavyInput extends ProgressStrokes {
  width: number;
  height: number;
  /** Wavelength in px (applies when amplitude > 0). */
  wavelength: number;
  /** Pairs of [start, end] fractions (0–1): one pair (determinate) or two (indeterminate). */
  fractions: readonly number[];
  /** 0–1 of the room the height leaves the stroke. */
  amplitude: number;
  /** 0–1: how far along a wavelength the wave has travelled. */
  waveOffset: number;
  /** Gap between the progress and the track (px). */
  gap: number;
}

export interface LinearWavyPaths {
  track: PathCommand[];
  /** One path per fraction pair (empty when the pair has no length). */
  progress: PathCommand[][];
  /** `currentStrokeCapWidth`. */
  capWidth: number;
}

interface LinearFull {
  key: string;
  measure: PathMeasure;
  /** Path length per px of width (> 1 for a wave). */
  scale: number;
}

/**
 * Linear wavy paths, LTR (Compose rotates the drawing 180° for RTL). Reuse one instance per
 * indicator: like LinearProgressDrawingCache it caches the measured full path.
 */
export class LinearWavyPathCache {
  #full: LinearFull | null = null;

  /** `updateFullPaths`: the full wave (or line, at amplitude 0), measured. */
  #fullPath(input: LinearWavyInput): LinearFull {
    const { width, height, wavelength, stroke } = input;
    const wavy = input.amplitude !== 0;
    const key = [width, height, wavy ? wavelength : 0, stroke].join();
    if (this.#full?.key === key) return this.#full;
    const path: PathCommand[] = [['M', 0, height / 2]];
    if (!wavy) {
      path.push(['L', width, height / 2]);
    } else {
      const half = wavelength / 2;
      let anchorX = half;
      let controlX = half / 2;
      // The control point at the full height (less the stroke) peaks the wave at half of it.
      let controlY = height - stroke;
      const end = width + wavelength * 2;
      while (anchorX <= end) {
        path.push(['Q', controlX, controlY + height / 2, anchorX, height / 2]);
        anchorX += half;
        controlX += half;
        controlY *= -1;
      }
    }
    const measure = new PathMeasure(path, false);
    const [left, , right] = pathBounds(path);
    this.#full = { key, measure, scale: measure.length / (right - left + 0.00000001) };
    return this.#full;
  }

  /** `updateDrawPaths`: the progress parts and the track for these fractions. */
  paths(input: LinearWavyInput): LinearWavyPaths {
    const { width, height, fractions, amplitude, waveOffset, gap } = input;
    const { measure, scale } = this.#fullPath(input);
    const cap = capWidth(input, width, height);
    const halfHeight = height / 2;
    const wavelength = input.wavelength;
    const progress: PathCommand[][] = [];
    const track: PathCommand[] = [];
    let adjustedGap = gap;
    let activeVisible = false;
    let nextEnd = width - cap;
    track.push(['M', nextEnd, halfHeight]);
    for (let i = 0; i + 1 < fractions.length; i += 2) {
      const start = fractions[i]!;
      const end = fractions[i + 1]!;
      const barTail = start * width;
      const barHead = end * width;
      if (i === 0) {
        // Shorten the gap while the progress enters the track (round caps need room first).
        adjustedGap = barHead < cap ? 0 : Math.min(barHead - cap, gap);
        activeVisible = barHead >= cap;
      }
      const head = Math.min(Math.max(barHead, cap), width - cap);
      const tail = Math.min(Math.max(barTail, cap), width - cap);
      let part: PathCommand[] = [];
      if (Math.abs(end - start) > 0) {
        const shift = amplitude !== 0 ? waveOffset * wavelength : 0;
        part = measure.getSegment((tail + shift) * scale, (head + shift) * scale);
        // Translate by the shift and flatten the (full amplitude) wave to the amplitude.
        part = part.map((c) => mapY(c, -Math.max(0, shift), amplitude, halfHeight));
      }
      progress.push(part);
      const spacing = activeVisible ? adjustedGap + cap * 2 : adjustedGap;
      if (nextEnd > head + spacing) track.push(['L', Math.max(cap, head + spacing), halfHeight]);
      if (barHead > barTail) {
        nextEnd = Math.max(cap, tail - spacing);
        track.push(['M', nextEnd, halfHeight]);
      }
    }
    if (nextEnd > cap) track.push(['L', cap, halfHeight]);
    return { track, progress, capWidth: cap };
  }
}

/** x + dx; y scaled by `amplitude` about the vertical center (Matrix translate, then scale(y)). */
function mapY(c: PathCommand, dx: number, amplitude: number, halfHeight: number): PathCommand {
  const y = (v: number) => amplitude * v + (1 - amplitude) * halfHeight;
  switch (c[0]) {
    case 'M':
    case 'L':
      return [c[0], c[1] + dx, y(c[2])];
    case 'Q':
      return ['Q', c[1] + dx, y(c[2]), c[3] + dx, y(c[4])];
    case 'C':
      return ['C', c[1] + dx, y(c[2]), c[3] + dx, y(c[4]), c[5] + dx, y(c[6])];
    case 'Z':
      return c;
  }
}

/**
 * The wavy linear stop indicator (`drawStopIndicator`): a dot of min(track stroke, `maxSize`) at the
 * end of the track that shrinks away as the progress reaches it. Returns its left edge and
 * diameter (LTR), or null when it has shrunk to nothing.
 */
export function linearWavyStopIndicator(
  progressEnd: number,
  width: number,
  maxSize: number,
  insets: number,
  trackStroke: number,
): { x: number; size: number } | null {
  let size = Math.min(trackStroke, maxSize);
  const offset = size === trackStroke ? 0 : trackStroke / 4;
  let x = width - size - offset;
  const progressX = width * progressEnd + insets;
  if (x <= progressX) {
    size = Math.max(0, size - (progressX - x));
    x = progressX;
  }
  return size > 0 ? { x, size } : null;
}

// CircularShapes (L1269–1407).
const MIN_VERTICES = 5;

/**
 * The wave count of a circular wavy indicator: as many wavelengths as fit around the circle (its
 * radius inset by half the stroke), at least 5 (`MinCircularVertexCount`).
 */
export const circularWavyVertexCount = (size: number, wavelength: number, stroke: number) =>
  Math.max(MIN_VERTICES, Math.round((2 * Math.PI * (size / 2 - stroke / 2)) / wavelength));

export interface CircularWavyInput extends ProgressStrokes {
  /** Square drawing size (px). */
  size: number;
  /** Preferred wavelength (px); the actual one fits a whole number of waves. */
  wavelength: number;
  start: number;
  end: number;
  amplitude: number;
  waveOffset: number;
  /** The wave offset applies (waveSpeed > 0 and a wave is drawn). */
  motion: boolean;
  gap: number;
}

export interface CircularWavyPaths {
  track: PathCommand[];
  progress: PathCommand[];
  /** Wave count, which scales the circular wave travel duration. */
  vertexCount: number;
}

interface CircularFull {
  key: string;
  progress: PathCommand[];
  measure: PathMeasure;
  length: number;
  center: readonly [number, number];
  track: PathMeasure;
}

/**
 * Circular wavy paths (CircularShapes + CircularProgressDrawingCache). Reuse one instance per
 * indicator: it caches the polygons, the morph (created the first time the amplitude is between 0
 * and 1, `requiresMorph`) and the measured full paths.
 */
export class CircularWavyPathCache {
  #shapesKey = '';
  #vertices = -1;
  #trackPolygon: RoundedPolygon | null = null;
  #activePolygon: RoundedPolygon | null = null;
  #morph: Morph | null = null;
  #full: CircularFull | null = null;

  /** `CircularShapes.update`. */
  #update(size: number, wavelength: number, stroke: number, requiresMorph: boolean): void {
    const key = [size, wavelength].join();
    if (key === this.#shapesKey) {
      if (requiresMorph && this.#morph === null)
        this.#morph = new Morph(this.#trackPolygon!, this.#activePolygon!);
      return;
    }
    const n = circularWavyVertexCount(size, wavelength, stroke);
    if (n !== this.#vertices) {
      this.#trackPolygon = circle({ numVertices: n }).normalized();
      this.#activePolygon = star(n, {
        innerRadius: 0.75,
        rounding: new CornerRounding(0.35, 0.4),
        innerRounding: new CornerRounding(0.5),
      }).normalized();
      this.#morph = requiresMorph ? new Morph(this.#trackPolygon, this.#activePolygon) : null;
      this.#full = null;
    }
    this.#shapesKey = key;
    this.#vertices = n;
  }

  /** The paths for `input`; `requiresMorph` as the Compose node passes it. */
  paths(input: CircularWavyInput, requiresMorph: boolean): CircularWavyPaths {
    const { size, wavelength, stroke, motion, start, end, gap } = input;
    this.#update(size, wavelength, stroke, requiresMorph);
    const full = this.#fullPaths(input);
    const cap = capWidth(input, size, size);
    const pStart = start * full.length;
    const pStop = end * full.length;
    const trackGap = Math.min(pStop, gap);
    const insets = Math.min(pStop, cap);
    const spacing = insets * 2 + trackGap;
    let progress: PathCommand[];
    if (motion) {
      const offset = Math.min(Math.max(input.waveOffset, 0), 1);
      const shift = offset * full.length;
      progress = full.measure.getSegment(pStart + shift, pStop + shift);
      const angle = (offset * 360) % 360;
      if (angle !== 0) {
        // Rotate the segment back about the full path's center to undo the shift.
        const [cx, cy] = full.center;
        progress = translatePath(
          transformPath(translatePath(progress, -cx, -cy), new Matrix().rotateZ(-angle)),
          cx,
          cy,
        );
      }
    } else {
      progress = full.measure.getSegment(pStart, pStop);
    }
    const trackLength = full.track.length;
    const track =
      trackLength > 0
        ? full.track.getSegment(end * trackLength + spacing, trackLength - spacing)
        : [];
    return { track, progress, vertexCount: this.#vertices };
  }

  /** `updateFullPaths` + `getProgressPath` / `getTrackPath` + `processPath`. */
  #fullPaths(input: CircularWavyInput): CircularFull {
    const { size, stroke, amplitude, motion } = input;
    const key = [size, stroke, amplitude, motion, this.#vertices, this.#morph !== null].join();
    if (this.#full?.key === key) return this.#full;
    const pivot = { rotationPivotX: 0.5, rotationPivotY: 0.5 };
    const raw =
      this.#morph !== null
        ? morphToPath(this.#morph, amplitude, { startAngle: 270, repeatPath: motion, ...pivot })
        : polygonToPath(amplitude === 1 ? this.#activePolygon! : this.#trackPolygon!, {
            startAngle: 270,
            repeatPath: motion,
          });
    const progress = processPath(raw, size, stroke);
    const measure = new PathMeasure(progress, true);
    const track = new PathMeasure(
      processPath(polygonToPath(this.#trackPolygon!, { startAngle: 270 }), size, stroke),
      true,
    );
    const [left, top, right, bottom] = pathBounds(progress);
    this.#full = {
      key,
      progress,
      measure,
      length: motion ? measure.length / 2 : measure.length,
      center: [(left + right) / 2, (top + bottom) / 2],
      track,
    };
    return this.#full;
  }
}

/** Scales a normalized path to the size less the stroke and centers it (`processPath`). */
function processPath(path: readonly PathCommand[], size: number, stroke: number): PathCommand[] {
  const scaled = transformPath(path, new Matrix().scale(size - stroke, size - stroke));
  const [left, top, right, bottom] = pathBounds(scaled);
  return translatePath(scaled, size / 2 - (left + right) / 2, size / 2 - (top + bottom) / 2);
}
