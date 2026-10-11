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
// Ported to TypeScript by Kyra Labs from compose/animation/animation-core/src/commonMain/kotlin/androidx/compose/animation/core/SpringEstimation.kt@19991f2c0858aadfcb442ce02b2c8e4743c96898
//
// The Float overload's arguments are rounded to float32 (Math.fround) before widening to Double,
// as in Kotlin. Durations are Long milliseconds: Kotlin's Double.toLong() (truncation, NaN → 0,
// saturating) is reproduced by `toLong`.

/** Maximum duration in Milliseconds. This takes into account that the duration will be converted to nanos. */
// Long.MAX_VALUE / Long.MIN_VALUE as doubles (2^63 is what Kotlin's Long.toDouble() yields).
const LONG_MAX = 2 ** 63;
const LONG_MIN = -(2 ** 63);
const MAX_LONG_MILLIS = 9_223_372_036_854; // Long.MAX_VALUE / 1_000_000 (integer division)

const toLong = (x: number): number =>
  Number.isNaN(x) ? 0 : x >= LONG_MAX ? LONG_MAX : x <= LONG_MIN ? LONG_MIN : Math.trunc(x);

/**
 * Returns the estimated time that the spring will last be at [delta]. Arguments are Kotlin
 * `Float`s (rounded to float32).
 */
export function estimateAnimationDurationMillis(
  stiffness: number,
  dampingRatio: number,
  initialVelocity: number,
  initialDisplacement: number,
  delta: number,
): number {
  const f32 = Math.fround;
  if (f32(dampingRatio) === 0) {
    // No damping, duration is infinite (max value).
    return MAX_LONG_MILLIS;
  }

  return estimateAnimationDurationMillisDouble(
    f32(stiffness),
    f32(dampingRatio),
    f32(initialVelocity),
    f32(initialDisplacement),
    f32(delta),
  );
}

/** Returns the estimated time that the spring will last be at [delta] (Double overload). */
export function estimateAnimationDurationMillisDouble(
  stiffness: number,
  dampingRatio: number,
  initialVelocity: number,
  initialDisplacement: number,
  delta: number,
): number {
  const dampingCoefficient = 2.0 * dampingRatio * Math.sqrt(stiffness);

  // Compute the roots of the polynomial [a]x^2+[b]x+[c]=0 which may be complex.
  // Here a is set to the constant 1.0, and folded into the other computations
  const partialRoot = dampingCoefficient * dampingCoefficient - 4.0 * stiffness;
  const partialRootReal = partialRoot < 0.0 ? 0.0 : Math.sqrt(partialRoot);
  const partialRootImaginary = partialRoot < 0.0 ? Math.sqrt(Math.abs(partialRoot)) : 0.0;

  const firstRootReal = (-dampingCoefficient + partialRootReal) * 0.5;
  const firstRootImaginary = partialRootImaginary * 0.5;
  const secondRootReal = (-dampingCoefficient - partialRootReal) * 0.5;

  return estimateDurationInternal(
    firstRootReal,
    firstRootImaginary,
    secondRootReal,
    dampingRatio,
    initialVelocity,
    initialDisplacement,
    delta,
  );
}

/**
 * In the under-damped case we simply calculate the envelope of the function. The general solution
 * is of the form x(t) = c_1*e^(r*t)*cos(...) + c_2*e^(r*t)sin(...) which simplifies to x(t) =
 * c*e^(r*t)*cos(...) where c*e^(r*t) is the envelope of x(t)
 */
function estimateUnderDamped(
  firstRootReal: number,
  firstRootImaginary: number,
  p0: number,
  v0: number,
  delta: number,
): number {
  const r = firstRootReal;
  const c1 = p0;
  const c2 = (v0 - r * c1) / firstRootImaginary;
  const c = Math.sqrt(c1 * c1 + c2 * c2);

  return Math.log(delta / c) / r;
}

const isNotFinite = (x: number) => !Number.isFinite(x);

const iterateNewtonsMethod = (
  x: number,
  fn: (t: number) => number,
  fnPrime: (t: number) => number,
): number => x - fn(x) / fnPrime(x);

/**
 * In the critically-damped case we apply Newton-Raphson's iterative numerical method of solving the
 * equation x(t) = c_1*e^(r*t) + c_2*t*e^(r*t)
 */
function estimateCriticallyDamped(
  firstRootReal: number,
  p0: number,
  v0: number,
  delta: number,
): number {
  const r = firstRootReal;
  const c1 = p0;
  const c2 = v0 - r * c1;

  // For our initial guess, determine the max t of c_1*e^(r*t) = delta and
  // c_2*t*e^(r*t) = delta
  const t1 = Math.log(Math.abs(delta / c1)) / r;
  const t2 =
    (() => {
      // Application of Lambert's W function to solve te^t
      const guess = Math.log(Math.abs(delta / c2));
      let t = guess;
      for (let i = 0; i <= 5; i++) {
        t = guess - Math.log(Math.abs(t / r));
      }
      return t;
    })() / r;
  let tCurr = isNotFinite(t1) ? t2 : isNotFinite(t2) ? t1 : Math.max(t1, t2);

  // Calculate the inflection time. This is important if the inflection is in t > 0
  const tInflection = -(r * c1 + c2) / (r * c2);
  const xInflection = c1 * Math.exp(r * tInflection) + c2 * tInflection * Math.exp(r * tInflection);

  // For inflection that does not exist in real time, we always solve for x(t)=delta. Note
  // the system is manipulated such that p0 is always positive.
  let signedDelta: number;
  if (Number.isNaN(tInflection) || tInflection <= 0.0) {
    signedDelta = -delta;
  } else if (tInflection > 0.0 && -xInflection < delta) {
    // In this scenario the first crossing with the threshold is to be found. Note that
    // the inflection does not exceed delta. As such, we search from the left.
    if (c2 < 0 && c1 > 0) {
      tCurr = 0.0;
    }
    signedDelta = -delta;
  } else {
    // In this scenario there are three total crossings of the threshold, once from
    // above, and then once when the inflection exceeds the threshold and then one last
    // one when x(t) finally decays to zero. The point of determining concavity is to
    // find the final crossing.
    //
    // By finding a point between when concavity changes, and when the inflection point is,
    // Newton's method will always converge onto the rightmost point (in this case),
    // the one that we are interested in.
    tCurr = -(2.0 / r) - c1 / c2;
    signedDelta = delta;
  }

  let tDelta = Number.MAX_VALUE;
  let iterations = 0;
  while (tDelta > 0.001 && iterations < 100) {
    iterations++;
    const tLast = tCurr;
    tCurr = iterateNewtonsMethod(
      tCurr,
      (t) => (c1 + c2 * t) * Math.exp(r * t) + signedDelta,
      (t) => (c2 * (r * t + 1) + c1 * r) * Math.exp(r * t),
    );
    tDelta = Math.abs(tLast - tCurr);
  }

  return tCurr;
}

/**
 * In the over-damped case we apply Newton-Raphson's iterative numerical method of solving the
 * equation x(t) = c_1*e^(r_1*t) + c_2*e^(r_2*t)
 */
function estimateOverDamped(
  firstRootReal: number,
  secondRootReal: number,
  p0: number,
  v0: number,
  delta: number,
): number {
  const r1 = firstRootReal;
  const r2 = secondRootReal;
  const c2 = (r1 * p0 - v0) / (r1 - r2);
  const c1 = p0 - c2;

  // For our initial guess, determine the max t of c_1*e^(r_1*t) = delta and
  // c_2*e^(r_2*t) = delta
  const t1 = Math.log(Math.abs(delta / c1)) / r1;
  const t2 = Math.log(Math.abs(delta / c2)) / r2;

  let tCurr = isNotFinite(t1) ? t2 : isNotFinite(t2) ? t1 : Math.max(t1, t2);

  // Calculate the inflection time. This is important if the inflection is in t > 0
  const tInflection = Math.log((c1 * r1) / (-c2 * r2)) / (r2 - r1);
  const xInflection = () => c1 * Math.exp(r1 * tInflection) + c2 * Math.exp(r2 * tInflection);

  // For inflection that does not exist in real time, we always solve for x(t)=delta. Note
  // the system is manipulated such that p0 is always positive.
  let signedDelta: number;
  if (Number.isNaN(tInflection) || tInflection <= 0.0) {
    signedDelta = -delta;
  } else if (tInflection > 0.0 && -xInflection() < delta) {
    // In this scenario the first crossing with the threshold is to be found. Note that
    // the inflection does not exceed delta. As such, we search from the left.
    if (c2 > 0.0 && c1 < 0.0) {
      tCurr = 0.0;
    }
    signedDelta = -delta;
  } else {
    // In this scenario there are three total crossings of the threshold, once from
    // above, and then once when the inflection exceeds the threshold and then one last
    // one when x(t) finally decays to zero. The point of determining concavity is to
    // find the final crossing.
    //
    // By finding a point between when concavity changes, and when the inflection point is,
    // Newton's method will always converge onto the rightmost point (in this case),
    // the one that we are interested in.
    tCurr = Math.log(-(c2 * r2 * r2) / (c1 * r1 * r1)) / (r1 - r2);
    signedDelta = delta;
  }

  // For a good initial guess, simply return
  if (Math.abs(c1 * r1 * Math.exp(r1 * tCurr) + c2 * r2 * Math.exp(r2 * tCurr)) < 0.0001) {
    return tCurr;
  }
  let tDelta = Number.MAX_VALUE;

  // Cap iterations for safety - Experimentally this method takes <= 5 iterations
  let iterations = 0;
  while (tDelta > 0.001 && iterations < 100) {
    iterations++;
    const tLast = tCurr;
    tCurr = iterateNewtonsMethod(
      tCurr,
      (t) => c1 * Math.exp(r1 * t) + c2 * Math.exp(r2 * t) + signedDelta,
      (t) => c1 * r1 * Math.exp(r1 * t) + c2 * r2 * Math.exp(r2 * t),
    );
    tDelta = Math.abs(tLast - tCurr);
  }

  return tCurr;
}

// Applies Newton-Raphson's method to solve for the estimated time the spring mass system will
// last be at [delta].
function estimateDurationInternal(
  firstRootReal: number,
  firstRootImaginary: number,
  secondRootReal: number,
  dampingRatio: number,
  initialVelocity: number,
  initialPosition: number,
  delta: number,
): number {
  if (initialPosition === 0.0 && initialVelocity === 0.0) {
    return 0;
  }

  const v0 = initialPosition < 0 ? -initialVelocity : initialVelocity;
  const p0 = Math.abs(initialPosition);

  const seconds =
    dampingRatio > 1.0
      ? estimateOverDamped(firstRootReal, secondRootReal, p0, v0, delta)
      : dampingRatio < 1.0
        ? estimateUnderDamped(firstRootReal, firstRootImaginary, p0, v0, delta)
        : estimateCriticallyDamped(firstRootReal, p0, v0, delta);
  return toLong(seconds * 1000.0);
}
