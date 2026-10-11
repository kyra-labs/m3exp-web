/*
 * Copyright 2022 The Android Open Source Project
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
// Ported to TypeScript by Kyra Labs from commonMain/androidx/graphics/shapes/Shapes.kt@androidx.graphics:graphics-shapes:1.0.1 (sources jar)
//
// Kotlin companion extensions (`RoundedPolygon.circle(...)`) become free functions.

import { CornerRounding } from './corner-rounding.js';
import { type Point, plus, point } from './point.js';
import { RoundedPolygon } from './rounded-polygon.js';
import { FloatPi, TwoPi, f, interpolate, radialToCartesian } from './utils.js';

/**
 * Creates a circular shape, approximating the rounding of the shape around the underlying polygon
 * vertices.
 */
export function circle(
  options: { numVertices?: number; radius?: number; centerX?: number; centerY?: number } = {},
): RoundedPolygon {
  const { numVertices = 8 } = options;
  const radius = f(options.radius ?? 1);
  const centerX = f(options.centerX ?? 0);
  const centerY = f(options.centerY ?? 0);
  if (numVertices < 3) throw new Error('Circle must have at least three vertices');

  // Half of the angle between two adjacent vertices on the polygon
  const theta = f(FloatPi / numVertices);
  // Radius of the underlying RoundedPolygon object given the desired radius of the circle
  const polygonRadius = f(radius / f(Math.cos(theta)));
  return RoundedPolygon.fromVertexCount(numVertices, {
    rounding: new CornerRounding(radius),
    radius: polygonRadius,
    centerX,
    centerY,
  });
}

/** Creates a rectangular shape with the given width/height around the given center. */
export function rectangle(
  options: {
    width?: number;
    height?: number;
    rounding?: CornerRounding;
    perVertexRounding?: readonly CornerRounding[] | null;
    centerX?: number;
    centerY?: number;
  } = {},
): RoundedPolygon {
  const { rounding = CornerRounding.Unrounded, perVertexRounding = null } = options;
  const width = f(options.width ?? 2);
  const height = f(options.height ?? 2);
  const centerX = f(options.centerX ?? 0);
  const centerY = f(options.centerY ?? 0);
  const left = f(centerX - f(width / 2));
  const top = f(centerY - f(height / 2));
  const right = f(centerX + f(width / 2));
  const bottom = f(centerY + f(height / 2));
  return RoundedPolygon.fromVertices([right, bottom, left, bottom, left, top, right, top], {
    rounding,
    perVertexRounding,
    centerX,
    centerY,
  });
}

/**
 * Creates a star polygon, which is like a regular polygon except every other vertex is on either
 * an inner or outer radius.
 */
export function star(
  numVerticesPerRadius: number,
  options: {
    radius?: number;
    innerRadius?: number;
    rounding?: CornerRounding;
    innerRounding?: CornerRounding | null;
    perVertexRounding?: readonly CornerRounding[] | null;
    centerX?: number;
    centerY?: number;
  } = {},
): RoundedPolygon {
  const { rounding = CornerRounding.Unrounded, innerRounding = null } = options;
  const radius = f(options.radius ?? 1);
  const innerRadius = f(options.innerRadius ?? 0.5);
  const centerX = f(options.centerX ?? 0);
  const centerY = f(options.centerY ?? 0);
  if (radius <= 0 || innerRadius <= 0) throw new Error('Star radii must both be greater than 0');
  if (innerRadius >= radius) throw new Error('innerRadius must be less than radius');

  let pvRounding = options.perVertexRounding ?? null;
  // If no per-vertex rounding supplied and caller asked for inner rounding,
  // create per-vertex rounding list based on supplied outer/inner rounding parameters
  if (pvRounding === null && innerRounding !== null) {
    pvRounding = Array.from({ length: numVerticesPerRadius }, () => [
      rounding,
      innerRounding,
    ]).flat();
  }

  // Star polygon is just a polygon with all vertices supplied (where we generate
  // those vertices to be on the inner/outer radii)
  return RoundedPolygon.fromVertices(
    starVerticesFromNumVerts(numVerticesPerRadius, radius, innerRadius, centerX, centerY),
    { rounding, perVertexRounding: pvRounding, centerX, centerY },
  );
}

/**
 * A pill shape consists of a rectangle shape bounded by two semicircles at either of the long
 * ends of the rectangle.
 */
export function pill(
  options: {
    width?: number;
    height?: number;
    smoothing?: number;
    centerX?: number;
    centerY?: number;
  } = {},
): RoundedPolygon {
  const width = f(options.width ?? 2);
  const height = f(options.height ?? 1);
  const smoothing = f(options.smoothing ?? 0);
  const centerX = f(options.centerX ?? 0);
  const centerY = f(options.centerY ?? 0);
  if (!(width > 0 && height > 0))
    throw new Error('Pill shapes must have positive width and height');
  const wHalf = f(width / 2);
  const hHalf = f(height / 2);
  return RoundedPolygon.fromVertices(
    [
      f(wHalf + centerX),
      f(hHalf + centerY),
      f(-wHalf + centerX),
      f(hHalf + centerY),
      f(-wHalf + centerX),
      f(-hHalf + centerY),
      f(wHalf + centerX),
      f(-hHalf + centerY),
    ],
    { rounding: new CornerRounding(Math.min(wHalf, hHalf), smoothing), centerX, centerY },
  );
}

/**
 * A pillStar shape is like a [pill] except it has inner and outer radii along its pill-shaped
 * outline, just like a [star] has inner and outer radii along its circular outline.
 */
export function pillStar(
  options: {
    width?: number;
    height?: number;
    numVerticesPerRadius?: number;
    innerRadiusRatio?: number;
    rounding?: CornerRounding;
    innerRounding?: CornerRounding | null;
    perVertexRounding?: readonly CornerRounding[] | null;
    vertexSpacing?: number;
    startLocation?: number;
    centerX?: number;
    centerY?: number;
  } = {},
): RoundedPolygon {
  const {
    numVerticesPerRadius = 8,
    rounding = CornerRounding.Unrounded,
    innerRounding = null,
  } = options;
  const width = f(options.width ?? 2);
  const height = f(options.height ?? 1);
  const innerRadiusRatio = f(options.innerRadiusRatio ?? 0.5);
  const vertexSpacing = f(options.vertexSpacing ?? 0.5);
  const startLocation = f(options.startLocation ?? 0);
  const centerX = f(options.centerX ?? 0);
  const centerY = f(options.centerY ?? 0);
  if (!(width > 0 && height > 0))
    throw new Error('Pill shapes must have positive width and height');
  if (!(innerRadiusRatio > 0 && innerRadiusRatio <= 1)) {
    throw new Error('innerRadius must be between 0 and 1');
  }
  let pvRounding = options.perVertexRounding ?? null;
  // If no per-vertex rounding supplied and caller asked for inner rounding,
  // create per-vertex rounding list based on supplied outer/inner rounding parameters
  if (pvRounding === null && innerRounding !== null) {
    pvRounding = Array.from({ length: numVerticesPerRadius }, () => [
      rounding,
      innerRounding,
    ]).flat();
  }
  return RoundedPolygon.fromVertices(
    pillStarVerticesFromNumVerts(
      numVerticesPerRadius,
      width,
      height,
      innerRadiusRatio,
      vertexSpacing,
      startLocation,
      centerX,
      centerY,
    ),
    { rounding, perVertexRounding: pvRounding, centerX, centerY },
  );
}

function pillStarVerticesFromNumVerts(
  numVerticesPerRadius: number,
  width: number,
  height: number,
  innerRadius: number,
  vertexSpacing: number,
  startLocation: number,
  centerX: number,
  centerY: number,
): number[] {
  // The general approach here is to get the perimeter of the underlying pill outline,
  // then the t value for each vertex as we walk that perimeter. This tells us where
  // on the outline to place that vertex, then we figure out where to place the vertex
  // depending on which "section" it is in. The possible sections are the vertical edges
  // on the sides, the circular sections on all four corners, or the horizontal edges
  // on the top and bottom. Note that either the vertical or horizontal edges will be
  // of length zero (whichever dimension is smaller gets only circular curvature for the
  // pill shape).
  const endcapRadius = Math.min(width, height);
  const vSegLen = Math.max(f(height - width), 0);
  const hSegLen = Math.max(f(width - height), 0);
  const vSegHalf = f(vSegLen / 2);
  const hSegHalf = f(hSegLen / 2);
  // vertexSpacing is used to position the vertices on the end caps. The caller has the choice
  // of spacing the inner (0) or outer (1) vertices like those along the edges, causing the
  // other vertices to be either further apart (0) or closer (1). The default is .5, which
  // averages things. The magnitude of the inner and rounding parameters may cause the caller
  // to want a different value.
  const circlePerimeter = f(f(TwoPi * endcapRadius) * interpolate(innerRadius, 1, vertexSpacing));
  // perimeter is circle perimeter plus horizontal and vertical sections of inner rectangle,
  // whether either (or even both) might be of length zero.
  const perimeter = f(f(f(2 * hSegLen) + f(2 * vSegLen)) + circlePerimeter);

  // The sections array holds the t start values of that part of the outline. We use these to
  // determine which section a given vertex lies in, based on its t value, as well as where
  // in that section it lies.
  const sections = new Float32Array(11);
  const quarter = f(circlePerimeter / 4);
  sections[0] = 0;
  sections[1] = vSegLen / 2;
  sections[2] = sections[1] + quarter;
  sections[3] = sections[2] + hSegLen;
  sections[4] = sections[3] + quarter;
  sections[5] = sections[4] + vSegLen;
  sections[6] = sections[5] + quarter;
  sections[7] = sections[6] + hSegLen;
  sections[8] = sections[7] + quarter;
  sections[9] = sections[8] + f(vSegLen / 2);
  sections[10] = perimeter;

  // "t" is the length along the entire pill outline for a given vertex. With vertices spaced
  // evenly along this contour, we can determine for any vertex where it should lie.
  const tPerVertex = f(perimeter / (2 * numVerticesPerRadius));
  // separate iteration for inner vs outer, unlike the other shapes, because
  // the vertices can lie in different quadrants so each needs their own calculation
  let inner = false;
  // Increment section index as we walk around the pill contour with our increasing t values
  let currSecIndex = 0;
  // secStart/End are used to determine how far along a given vertex is in the section
  // in which it lands
  let secStart = 0;
  let secEnd = sections[1];
  // t value is used to place each vertex. 0 is on the positive x axis,
  // moving into section 0 to begin with. startLocation, a value from 0 to 1, varies the location
  // anywhere on the perimeter of the shape
  let t = f(startLocation * perimeter);
  // The list of vertices to be returned
  const result: number[] = [];
  const rectBR = point(hSegHalf, vSegHalf);
  const rectBL = point(-hSegHalf, vSegHalf);
  const rectTL = point(-hSegHalf, -vSegHalf);
  const rectTR = point(hSegHalf, -vSegHalf);
  // Each iteration through this loop uses the next t value as we walk around the shape
  for (let i = 0; i < numVerticesPerRadius * 2; i++) {
    // t could start (and end) after 0; extra boundedT logic makes sure it does the right
    // thing when crossing the boundar past 0 again
    const boundedT = f(t % perimeter);
    if (boundedT < secStart) currSecIndex = 0;
    while (boundedT >= sections[(currSecIndex + 1) % sections.length]!) {
      currSecIndex = (currSecIndex + 1) % sections.length;
      secStart = sections[currSecIndex]!;
      secEnd = sections[(currSecIndex + 1) % sections.length]!;
    }
    // find t in section and its proportion of that section total length
    const tInSection = f(boundedT - secStart);
    const tProportion = f(tInSection / f(secEnd - secStart));
    const halfArc = f(f(tProportion * FloatPi) / 2);

    // The vertex placement in a section varies depending on whether it is on one of the
    // semicircle endcaps or along one of the straight edges. For the endcaps, we use
    // tProportion to get the angle along that circular cap and add
    // the starting angle for that section. For the edges we use a straight linear calculation
    // given tProportion and the start/end t values for that edge.
    const currRadius = inner ? f(endcapRadius * innerRadius) : endcapRadius;
    let vertex: Point;
    switch (currSecIndex) {
      case 0:
        vertex = point(currRadius, f(tProportion * vSegHalf));
        break;
      case 1:
        vertex = plus(radialToCartesian(currRadius, halfArc), rectBR);
        break;
      case 2:
        vertex = point(f(hSegHalf - f(tProportion * hSegLen)), currRadius);
        break;
      case 3:
        vertex = plus(radialToCartesian(currRadius, f(f(FloatPi / 2) + halfArc)), rectBL);
        break;
      case 4:
        vertex = point(-currRadius, f(vSegHalf - f(tProportion * vSegLen)));
        break;
      case 5:
        vertex = plus(radialToCartesian(currRadius, f(FloatPi + halfArc)), rectTL);
        break;
      case 6:
        vertex = point(f(-hSegHalf + f(tProportion * hSegLen)), -currRadius);
        break;
      case 7:
        vertex = plus(radialToCartesian(currRadius, f(f(FloatPi * 1.5) + halfArc)), rectTR);
        break;
      default: // 8
        vertex = point(currRadius, f(-vSegHalf + f(tProportion * vSegHalf)));
    }
    result.push(f(vertex.x + centerX), f(vertex.y + centerY));
    t = f(t + tPerVertex);
    inner = !inner;
  }
  return result;
}

function starVerticesFromNumVerts(
  numVerticesPerRadius: number,
  radius: number,
  innerRadius: number,
  centerX: number,
  centerY: number,
): number[] {
  const result: number[] = [];
  for (let i = 0; i < numVerticesPerRadius; i++) {
    let vertex = radialToCartesian(radius, f(f(f(FloatPi / numVerticesPerRadius) * 2) * i));
    result.push(f(vertex.x + centerX), f(vertex.y + centerY));
    vertex = radialToCartesian(innerRadius, f(f(FloatPi / numVerticesPerRadius) * (2 * i + 1)));
    result.push(f(vertex.x + centerX), f(vertex.y + centerY));
  }
  return result;
}
