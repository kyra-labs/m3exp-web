import {
  CircularProgressDriver,
  LinearProgressDriver,
  type ProgressIndicatorDriver,
  circularProgressClass,
  linearProgressClass,
  linearProgressParts,
  progressValue,
} from '@kyralabs/m3e-elements/progress-indicator.js';
import {
  type ForwardedRef,
  type HTMLAttributes,
  type RefObject,
  forwardRef,
  useLayoutEffect,
  useRef,
} from 'react';
import { useObjectRef } from 'react-aria';
import { cx } from '../utils/cx.js';

export interface ProgressProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** 0–1 makes it determinate; omit for indeterminate. */
  value?: number;
  /** `wavy` draws Compose's wave (Linear/CircularWavyProgressIndicator). Default `flat`. */
  shape?: 'flat' | 'wavy';
  /** `thick`: the 8dp sample configuration (14dp wavy linear, 52dp circular containers). */
  thickness?: 'default' | 'thick';
  /**
   * Wave amplitude, 0–1 (Compose `amplitude`): fixed, or a function of the progress. Default:
   * flat at ≤ 10% and ≥ 95% (determinate), full (indeterminate).
   */
  amplitude?: number | ((progress: number) => number);
  /** Wavelength in px (Compose `wavelength`). Default: the wavelength token. */
  wavelength?: number;
  /** Wave speed in px per second (Compose `waveSpeed`). Default: one wavelength per second. */
  waveSpeed?: number;
  /** Accessible name of the progress bar (e.g. "Loading news article"). */
  'aria-label'?: string;
}

type DriverClass = new (root: HTMLElement) => ProgressIndicatorDriver;

/** Creates the m3e-elements driver once and feeds it the props after every render. */
function useDriver(
  root: RefObject<HTMLDivElement | null>,
  Driver: DriverClass,
  {
    value,
    shape,
    amplitude,
    wavelength,
    waveSpeed,
  }: {
    value: number | undefined;
    shape: 'flat' | 'wavy';
    amplitude: ProgressProps['amplitude'] | undefined;
    wavelength: number | undefined;
    waveSpeed: number | undefined;
  },
): void {
  const driver = useRef<ProgressIndicatorDriver | null>(null);
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    driver.current = new Driver(el);
    return () => {
      driver.current?.disconnect();
      driver.current = null;
    };
  }, [root, Driver]);
  useLayoutEffect(() => {
    driver.current?.update({
      value: value ?? null,
      shape,
      amplitude,
      wavelength,
      waveSpeed,
    });
  });
}

const ariaValues = (value: number | undefined) => {
  const now = progressValue(value ?? null);
  return now === null
    ? {}
    : { 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Number(now) };
};

/**
 * Linear progress indicator (COMPONENT_SPEC §8): the m3e-css `.m3e-linear-progress` contract, the
 * same DOM as `<m3e-linear-progress>`, driven by m3e-elements' LinearProgressDriver (value on
 * Compose's progress spring with velocity kept, wavy paths every frame).
 */
export const LinearProgress = /* @__PURE__ */ forwardRef(function LinearProgress(
  props: ProgressProps,
  forwardedRef: ForwardedRef<HTMLDivElement>,
) {
  const {
    value,
    shape = 'flat',
    thickness = 'default',
    amplitude,
    wavelength,
    waveSpeed,
    className,
    ...rest
  } = props;
  const root = useObjectRef(forwardedRef);
  useDriver(root, LinearProgressDriver, { value, shape, amplitude, wavelength, waveSpeed });
  const parts = linearProgressParts({ shape, value: value ?? null });
  const B = 'm3e-linear-progress';
  return (
    <div
      {...rest}
      ref={root}
      className={cx(linearProgressClass({ shape, thickness }), className)}
      role="progressbar"
      data-driven=""
      {...ariaValues(value)}
    >
      {shape === 'wavy' ? (
        <svg className={`${B}__wave`} aria-hidden="true" focusable="false">
          {parts.map((part, i) =>
            part === 'wave-stop' ? (
              <circle key={i} className={`${B}__${part}`} />
            ) : (
              <path key={i} className={`${B}__${part}`} />
            ),
          )}
        </svg>
      ) : (
        parts.map((part, i) => <span key={i} className={`${B}__${part}`} />)
      )}
    </div>
  );
});

/**
 * Circular progress indicator (COMPONENT_SPEC §8): the m3e-css `.m3e-circular-progress`
 * contract, the same DOM as `<m3e-circular-progress>`, driven by m3e-elements'
 * CircularProgressDriver (value on Compose's progress spring, the wavy star every frame).
 */
export const CircularProgress = /* @__PURE__ */ forwardRef(function CircularProgress(
  props: ProgressProps,
  forwardedRef: ForwardedRef<HTMLDivElement>,
) {
  const {
    value,
    shape = 'flat',
    thickness = 'default',
    amplitude,
    wavelength,
    waveSpeed,
    className,
    ...rest
  } = props;
  const root = useObjectRef(forwardedRef);
  useDriver(root, CircularProgressDriver, { value, shape, amplitude, wavelength, waveSpeed });
  const B = 'm3e-circular-progress';
  const Part = shape === 'wavy' ? 'path' : 'circle';
  return (
    <div
      {...rest}
      ref={root}
      className={cx(circularProgressClass({ shape, thickness }), className)}
      role="progressbar"
      data-driven=""
      {...ariaValues(value)}
    >
      <svg className={`${B}__svg`} aria-hidden="true" focusable="false">
        <Part key={`${Part}-track`} className={`${B}__track`} />
        <Part key={`${Part}-indicator`} className={`${B}__indicator`} />
      </svg>
    </div>
  );
});
