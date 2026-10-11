/*
 * Copyright 2019 The Android Open Source Project
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
// Ported to TypeScript by Kyra Labs from compose/animation/animation-core/src/commonMain/kotlin/androidx/compose/animation/core/SpringSimulation.kt@19991f2c0858aadfcb442ce02b2c8e4743c96898
//
// Precision follows the Kotlin source: parameters and results are Float (Math.fround), the
// solution is computed in Double, and time is whole milliseconds.

const f32 = Math.fround;

/** `Spring.StiffnessVeryLow` / `Spring.DampingRatioNoBouncy` (VectorizedAnimationSpec.kt L813, L839). */
const STIFFNESS_VERY_LOW = 50;
const DAMPING_RATIO_NO_BOUNCY = 1;

export interface Motion {
  value: number;
  velocity: number;
}

/**
 * Spring Simulation simulates spring physics, and allows you to query the motion (i.e. value and
 * velocity) at certain time in the future based on the starting velocity and value.
 *
 * By configuring the stiffness and damping ratio, callers can create a spring with the look and
 * feel suits their use case. Stiffness corresponds to the spring constant. The stiffer the spring
 * is, the harder it is to stretch it, the faster it undergoes dampening.
 *
 * Spring damping ratio describes how oscillations in a system decay after a disturbance. When
 * damping ratio > 1* (i.e. over-damped), the object will quickly return to the rest position
 * without overshooting. If damping ratio equals to 1 (i.e. critically damped), the object will
 * return to equilibrium within the shortest amount of time. When damping ratio is less than 1 (i.e.
 * under-damped), the mass tends to overshoot, and return, and overshoot again. Without any damping
 * (i.e. damping ratio = 0), the mass will oscillate forever.
 */
export class SpringSimulation {
  // Natural frequency
  #naturalFreq = Math.sqrt(STIFFNESS_VERY_LOW);
  #dampingRatio = DAMPING_RATIO_NO_BOUNCY;
  #finalPosition: number;

  constructor(finalPosition: number) {
    this.#finalPosition = f32(finalPosition);
  }

  get finalPosition(): number {
    return this.#finalPosition;
  }

  set finalPosition(value: number) {
    this.#finalPosition = f32(value);
  }

  /** Stiffness of the spring. */
  get stiffness(): number {
    return f32(this.#naturalFreq * this.#naturalFreq);
  }

  set stiffness(value: number) {
    // Upstream checks the *current* stiffness here (always positive), so the new value is not
    // validated; kept as-is for parity.
    if (this.stiffness <= 0) {
      throw new RangeError('Spring stiffness constant must be positive.');
    }
    this.#naturalFreq = Math.sqrt(f32(value));
  }

  /** Returns the damping ratio of the spring. */
  get dampingRatio(): number {
    return this.#dampingRatio;
  }

  set dampingRatio(value: number) {
    if (value < 0) {
      throw new RangeError('Damping ratio must be non-negative');
    }
    this.#dampingRatio = f32(value);
  }

  getAcceleration(lastDisplacement: number, lastVelocity: number): number {
    const adjustedDisplacement = f32(f32(lastDisplacement) - this.#finalPosition);

    const k = this.#naturalFreq * this.#naturalFreq;
    const c = 2.0 * this.#naturalFreq * this.#dampingRatio;

    return f32(-k * adjustedDisplacement - c * f32(lastVelocity));
  }

  /**
   * Internal only call for Spring to calculate the spring position/velocity using an analytical
   * approach.
   */
  updateValues(lastDisplacement: number, lastVelocity: number, timeElapsed: number): Motion {
    const dampingRatio = this.#dampingRatio;
    const naturalFreq = this.#naturalFreq;
    const velocity0 = f32(lastVelocity);
    const adjustedDisplacement = f32(f32(lastDisplacement) - this.#finalPosition);
    const deltaT = Math.trunc(timeElapsed) / 1000.0; // unit: seconds
    const dampingRatioSquared = dampingRatio * dampingRatio;
    const r = -dampingRatio * naturalFreq;

    let displacement: number;
    let currentVelocity: number;

    if (dampingRatio > 1) {
      // Over damping
      const s = naturalFreq * Math.sqrt(dampingRatioSquared - 1);
      const gammaPlus = r + s;
      const gammaMinus = r - s;

      // Overdamped
      const coeffB = (gammaMinus * adjustedDisplacement - velocity0) / (gammaMinus - gammaPlus);
      const coeffA = adjustedDisplacement - coeffB;
      displacement = coeffA * Math.exp(gammaMinus * deltaT) + coeffB * Math.exp(gammaPlus * deltaT);
      currentVelocity =
        coeffA * gammaMinus * Math.exp(gammaMinus * deltaT) +
        coeffB * gammaPlus * Math.exp(gammaPlus * deltaT);
    } else if (dampingRatio === 1.0) {
      // Critically damped
      const coeffA = adjustedDisplacement;
      const coeffB = velocity0 + naturalFreq * adjustedDisplacement;
      const nFdT = -naturalFreq * deltaT;
      displacement = (coeffA + coeffB * deltaT) * Math.exp(nFdT);
      currentVelocity =
        (coeffA + coeffB * deltaT) * Math.exp(nFdT) * -naturalFreq + coeffB * Math.exp(nFdT);
    } else {
      const dampedFreq = naturalFreq * Math.sqrt(1 - dampingRatioSquared);
      // Underdamped
      const cosCoeff = adjustedDisplacement;
      const sinCoeff = (1 / dampedFreq) * (-r * adjustedDisplacement + velocity0);
      const dFdT = dampedFreq * deltaT;
      displacement = Math.exp(r * deltaT) * (cosCoeff * Math.cos(dFdT) + sinCoeff * Math.sin(dFdT));
      currentVelocity =
        displacement * r +
        Math.exp(r * deltaT) *
          (-dampedFreq * cosCoeff * Math.sin(dFdT) + dampedFreq * sinCoeff * Math.cos(dFdT));
    }

    return {
      value: f32(displacement + this.#finalPosition),
      velocity: f32(currentVelocity),
    };
  }
}
