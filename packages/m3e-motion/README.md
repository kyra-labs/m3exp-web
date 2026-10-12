# @kyralabs/m3e-motion

Spring math for m3exp-web: TypeScript ports of Compose's `SpringSimulation` and spring duration
estimate (float32-exact against the JVM), `FloatSpringSpec` helpers, a CSS `linear()` sampler and
the top app bar scroll state. Mostly used by the other `@kyralabs` packages; no DOM access.

```sh
npm install @kyralabs/m3e-motion
```

## Usage

```ts
import { springDurationMillis, springToLinear, springValue } from '@kyralabs/m3e-motion';

const spec = { dampingRatio: 0.9, stiffness: 700 };
springValue(spec, 100, 0, 1); // position after 100 ms, animating 0 → 1
springDurationMillis(spec, 0, 1); // settle time in ms
springToLinear(spec); // CSS linear() easing plus its duration
```

Apache-2.0; see `LICENSE` and `NOTICE`.
