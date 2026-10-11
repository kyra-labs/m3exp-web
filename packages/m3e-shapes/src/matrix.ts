/*
 * Copyright 2020 The Android Open Source Project
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
// Ported to TypeScript by Kyra Labs from compose/ui/ui-graphics/src/commonMain/kotlin/androidx/compose/ui/graphics/Matrix.kt@19991f2c0858aadfcb442ce02b2c8e4743c96898
//
// Only the subset MaterialShapes and ShapeUtil use: identity, rotateZ, scale and map(point).
// Values are stored and computed as float32, like Compose's FloatArray math.

const f = Math.fround;

/** A 4x4 matrix, row-major as in Compose (`this[row, column]`). Identity when created. */
export class Matrix {
  readonly values: Float32Array = new Float32Array([
    1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
  ]);

  get(row: number, column: number): number {
    return this.values[row * 4 + column] ?? 0;
  }

  set(row: number, column: number, v: number): void {
    this.values[row * 4 + column] = v;
  }

  /** Does the 3D transform on the point and returns its `x` and `y` values. */
  map(x: number, y: number): readonly [number, number] {
    const v00 = this.get(0, 0);
    const v01 = this.get(0, 1);
    const v03 = this.get(0, 3);
    const v10 = this.get(1, 0);
    const v11 = this.get(1, 1);
    const v13 = this.get(1, 3);
    const v30 = this.get(3, 0);
    const v31 = this.get(3, 1);
    const v33 = this.get(3, 3);

    const z = f(f(f(v03 * x) + f(v13 * y)) + v33);
    const inverseZ = f(1 / z);
    const pZ = Number.isFinite(inverseZ) ? inverseZ : 0;

    return [
      f(pZ * f(f(f(v00 * x) + f(v10 * y)) + v30)),
      f(pZ * f(f(f(v01 * x) + f(v11 * y)) + v31)),
    ];
  }

  /** Applies a rotation of [degrees] around Z to `this`. */
  rotateZ(degrees: number): this {
    const r = f(degrees) * (Math.PI / 180);
    const s = Math.fround(Math.sin(r));
    const c = Math.fround(Math.cos(r));
    for (let column = 0; column < 4; column++) {
      const a0 = this.get(0, column);
      const a1 = this.get(1, column);
      this.set(0, column, f(c * a0) + f(s * a1));
      this.set(1, column, f(-s * a0) + f(c * a1));
    }
    return this;
  }

  /** Scales this matrix by [x], [y], [z]. */
  scale(x = 1, y = 1, z = 1): this {
    for (let column = 0; column < 4; column++) {
      this.set(0, column, this.get(0, column) * f(x));
      this.set(1, column, this.get(1, column) * f(y));
      this.set(2, column, this.get(2, column) * f(z));
    }
    return this;
  }
}
