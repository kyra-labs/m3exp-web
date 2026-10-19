import {
  type RecommendedTimeout,
  SNACKBAR_DISMISS_LABEL,
  type SnackbarData,
  SnackbarHostController,
  SnackbarHostState,
} from '@kyralabs/m3e-elements/snackbar-layout.js';
import {
  type ForwardedRef,
  type HTMLAttributes,
  type ReactNode,
  forwardRef,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { mergeRefs } from 'react-aria';
import { Icon } from '../icon/Icon.js';
import { PlainTooltip } from '../tooltip/Tooltip.js';
import { TooltipTrigger } from '../tooltip/TooltipTrigger.js';
import { cx } from '../utils/cx.js';

/**
 * A SnackbarHostState for `<SnackbarHost hostState>` (Compose `remember { SnackbarHostState() }`):
 * `showSnackbar(message | { message, actionLabel, withDismissAction, duration, signal })` queues
 * a snackbar and resolves with `'action-performed'` or `'dismissed'`.
 */
export function useSnackbarHostState(): SnackbarHostState {
  const [state] = useState(() => new SnackbarHostState());
  return state;
}

type SnackbarAttributes = Omit<HTMLAttributes<HTMLDivElement>, 'children'>;

export interface SnackbarProps extends SnackbarAttributes {
  /**
   * The data from a `<SnackbarHost>` (Compose `Snackbar(snackbarData)`): its message, its action
   * (a text button that performs it) and its dismiss action (an icon button "Dismiss" with a
   * tooltip). Without it, `children`, `action` and `dismissAction` are rendered as given.
   */
  snackbarData?: SnackbarData | undefined;
  /** The action under the text (Compose `actionOnNewLine`); only with an action. */
  actionOnNewLine?: boolean | undefined;
  /** The dismiss button's name and tooltip (default "Dismiss", Compose `Strings.SnackbarDismiss`). */
  dismissLabel?: string | undefined;
  /** The action (a text button with `className="m3e-button m3e-button--text m3e-snackbar__action"`). */
  action?: ReactNode;
  /** The extra close affordance (an icon button with `className="m3e-icon-button m3e-snackbar__dismiss"`). */
  dismissAction?: ReactNode;
  /** The message (without `snackbarData`). */
  children?: ReactNode;
}

/**
 * Snackbar (COMPONENT_SPEC §32; Compose `Snackbar`): inverse surface, extra-small corners, the
 * level 3 shadow; the text, then the action (inverse primary) and the dismiss button at the end,
 * or the action under the text (`actionOnNewLine`). 48dp for a line of text, 68dp for two. Usually
 * rendered by `<SnackbarHost>`.
 */
export const Snackbar = /* @__PURE__ */ forwardRef(function Snackbar(
  {
    snackbarData,
    actionOnNewLine = false,
    dismissLabel = SNACKBAR_DISMISS_LABEL,
    action: actionProp,
    dismissAction: dismissProp,
    children,
    className,
    ...rest
  }: SnackbarProps,
  ref: ForwardedRef<HTMLDivElement>,
) {
  let message: ReactNode = children;
  let action: ReactNode = actionProp;
  let dismiss: ReactNode = dismissProp;
  if (snackbarData) {
    const { visuals } = snackbarData;
    message = visuals.message;
    action =
      visuals.actionLabel === null ? null : (
        <button
          type="button"
          className="m3e-button m3e-button--text m3e-snackbar__action"
          onClick={() => {
            snackbarData.performAction();
          }}
        >
          {visuals.actionLabel}
        </button>
      );
    // TooltipBox(Above) { IconButton(Close) } with PlainTooltip(contentDescription).
    dismiss = visuals.withDismissAction ? (
      <TooltipTrigger>
        <button
          type="button"
          className="m3e-icon-button m3e-snackbar__dismiss"
          aria-label={dismissLabel}
          onClick={() => {
            snackbarData.dismiss();
          }}
        >
          <Icon name="close" />
        </button>
        <PlainTooltip>{dismissLabel}</PlainTooltip>
      </TooltipTrigger>
    ) : null;
  }
  const hasAction = action !== undefined && action !== null && action !== false;
  const hasDismiss = dismiss !== undefined && dismiss !== null && dismiss !== false;
  return (
    <div
      {...rest}
      ref={ref}
      className={cx(
        'm3e-snackbar',
        actionOnNewLine && hasAction && 'm3e-snackbar--action-on-new-line',
        className,
      )}
    >
      <div className="m3e-snackbar__text">{message}</div>
      {hasAction || hasDismiss ? (
        <div className="m3e-snackbar__actions">
          {action}
          {dismiss}
        </div>
      ) : null}
    </div>
  );
});

export interface SnackbarHostProps extends SnackbarAttributes {
  /** The queue (`useSnackbarHostState()`). */
  hostState: SnackbarHostState;
  /** Renders each snackbar (Compose's `snackbar` slot). Default: `<Snackbar snackbarData>`. */
  snackbar?: ((data: SnackbarData) => ReactNode) | undefined;
  /** Passed to the default `<Snackbar>`. */
  actionOnNewLine?: boolean | undefined;
  /** Passed to the default `<Snackbar>`. */
  dismissLabel?: string | undefined;
  /**
   * Android's `calculateRecommendedTimeoutMillis` stand-in: the time to use for a duration (the
   * web has no accessibility timeout setting; default: the duration).
   */
  recommendedTimeout?: RecommendedTimeout | undefined;
}

interface ItemProps {
  data: SnackbarData;
  visible: boolean;
  controller: SnackbarHostController | null;
  onRemoved: (data: SnackbarData) => void;
  children: ReactNode;
}

/** FadeInFadeOutAnimationItem: springs in while current, out (then removed) once replaced. */
function SnackbarItem({ data, visible, controller, onRemoved, children }: ItemProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const removed = useRef(onRemoved);
  removed.current = onRemoved;
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !controller) return;
    if (visible) controller.enter(el, data);
    else {
      controller.exit(el, () => {
        removed.current(data);
      });
    }
  }, [visible, controller, data]);
  return (
    <div ref={ref} className="m3e-snackbar-host__item">
      {children}
    </div>
  );
}

/**
 * Snackbar host (COMPONENT_SPEC §32; Compose `SnackbarHost`): shows `hostState`'s snackbars one at
 * a time, fixed to the bottom center of the window and raised by
 * `--m3e-comp-snackbar-host-bottom-offset` (set it above a FAB). A polite live region
 * (`role="status"`); the current snackbar fades and scales in, the previous one out
 * (FadeInFadeOutWithScale), and it is dismissed after its duration, paused while hovered or
 * focused; Escape in it dismisses it. Focus is never moved to it on its own: `hostState.focus()`
 * moves it to the current snackbar's action (bind it to a shortcut of your app). Runs the
 * m3e-elements SnackbarHostController, as `<m3e-snackbar-host>` does. Other props go to the host
 * `<div>`.
 */
export const SnackbarHost = /* @__PURE__ */ forwardRef(function SnackbarHost(
  {
    hostState,
    snackbar,
    actionOnNewLine,
    dismissLabel,
    recommendedTimeout,
    className,
    ...rest
  }: SnackbarHostProps,
  forwardedRef: ForwardedRef<HTMLDivElement>,
) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [controller, setController] = useState<SnackbarHostController | null>(null);
  const current = useSyncExternalStore(
    hostState.subscribe,
    () => hostState.currentSnackbarData,
    () => null,
  );
  const [items, setItems] = useState<SnackbarData[]>([]);
  // The current snackbar joins the list (the leaving ones stay until their fade ends).
  if (current && !items.includes(current)) setItems([...items, current]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const created = new SnackbarHostController(el, { state: hostState });
    setController(created);
    return () => {
      created.destroy();
      setController(null);
    };
  }, [hostState]);
  useLayoutEffect(() => {
    if (controller) controller.recommendedTimeout = recommendedTimeout;
  }, [controller, recommendedTimeout]);

  const render =
    snackbar ??
    ((data: SnackbarData) => (
      <Snackbar snackbarData={data} actionOnNewLine={actionOnNewLine} dismissLabel={dismissLabel} />
    ));
  return (
    <div
      {...rest}
      ref={mergeRefs(ref, forwardedRef)}
      className={cx('m3e-snackbar-host', className)}
      role="status"
    >
      {items.map((data) => (
        <SnackbarItem
          key={keyOf(data)}
          data={data}
          visible={data === current}
          controller={controller}
          onRemoved={(gone) => {
            setItems((list) => list.filter((d) => d !== gone));
          }}
        >
          {render(data)}
        </SnackbarItem>
      ))}
    </div>
  );
});

const keys = new WeakMap<SnackbarData, string>();
let nextKey = 0;
/** A stable React key per snackbar (Compose keys the items by their data). */
function keyOf(data: SnackbarData): string {
  let key = keys.get(data);
  if (key === undefined) {
    key = String(++nextKey);
    keys.set(data, key);
  }
  return key;
}
