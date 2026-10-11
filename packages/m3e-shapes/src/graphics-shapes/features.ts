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
// Ported to TypeScript by Kyra Labs from commonMain/androidx/graphics/shapes/Features.kt@androidx.graphics:graphics-shapes:1.0.1 (sources jar)

import type { Cubic } from './cubic.js';
import { type Point, type PointTransformer, transformed } from './point.js';

/**
 * This class holds information about a corner (rounded or not) or an edge of a given polygon. The
 * features of a Polygon can be used to manipulate the shape with more context of what the shape
 * actually is, rather than simply manipulating the raw curves and lines which describe it.
 */
export abstract class Feature {
  constructor(readonly cubics: readonly Cubic[]) {}

  abstract transformed(f: PointTransformer): Feature;

  abstract toString(): string;
}

/**
 * Edges have only a list of the cubic curves which make up the edge. Edges lie between corners
 * and have no vertex or concavity; the curves are simply straight lines (represented by Cubic
 * curves).
 */
export class Edge extends Feature {
  transformed(f: PointTransformer): Edge {
    return new Edge(this.cubics.map((c) => c.transformed(f)));
  }

  toString(): string {
    return 'Edge';
  }
}

/**
 * Corners contain the list of cubic curves which describe how the corner is rounded (or not),
 * plus the vertex at the corner (which the cubics may or may not pass through, depending on
 * whether the corner is rounded) and a flag indicating whether the corner is convex. A regular
 * polygon has all convex corners, while a star polygon generally (but not necessarily) has both
 * convex (outer) and concave (inner) corners.
 */
export class Corner extends Feature {
  constructor(
    cubics: readonly Cubic[],
    readonly vertex: Point,
    readonly roundedCenter: Point,
    readonly convex = true,
  ) {
    super(cubics);
  }

  transformed(f: PointTransformer): Corner {
    return new Corner(
      this.cubics.map((c) => c.transformed(f)),
      transformed(this.vertex, f),
      transformed(this.roundedCenter, f),
      this.convex,
    );
  }

  toString(): string {
    return `Corner: vertex=(${String(this.vertex.x)}, ${String(this.vertex.y)}), center=(${String(this.roundedCenter.x)}, ${String(this.roundedCenter.y)}), convex=${String(this.convex)}`;
  }
}
