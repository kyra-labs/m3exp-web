// m3e-elements is bundled (a devDependency); the public types come from m3e-motion (a dependency).
// The motion and drag handle entries are imported statically here (the elements load them lazily).
import { attachPaneExpansion } from '@kyralabs/m3e-elements/pane-expansion.js';
import {
  ThreePaneScaffoldAnimation,
  calculatePaneMotion,
  paneTransitions,
} from '@kyralabs/m3e-elements/pane-motion.js';
import {
  PANE_EXPANSION_DRAG_HANDLE_LABEL,
  PANE_SCAFFOLD_PANE_NAMES,
  PANE_SCAFFOLD_PANE_TITLES,
  PaneScaffoldLayout,
  type PaneScaffoldNavigatorOptions,
  type PaneScaffoldVariant,
  createPaneScaffoldNavigator,
  paneScaffoldOrder,
  paneScaffoldRole,
} from '@kyralabs/m3e-elements/pane-scaffold-layout.js';
import type {
  BackNavigationBehavior,
  PaneExpansionAnchor,
  PaneRule,
  ThreePaneScaffoldDestinationItem,
  ThreePaneScaffoldNavigator,
  ThreePaneScaffoldRole,
  ThreePaneScaffoldValue,
} from '@kyralabs/m3e-motion';
import {
  type CSSProperties,
  type ForwardedRef,
  type HTMLAttributes,
  type ReactNode,
  forwardRef,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { useObjectRef } from 'react-aria';
import { cx } from '../utils/cx.js';

/** List-detail pane names (Compose ListDetailPaneScaffoldRole). */
export type ListDetailPane = 'list' | 'detail' | 'extra';
/** Supporting-pane pane names (Compose SupportingPaneScaffoldRole). */
export type SupportingPane = 'main' | 'supporting' | 'extra';

/**
 * A pane scaffold navigator (Compose ThreePaneScaffoldNavigator): the destination history and the
 * scaffold value it gives for the scaffold's size. Re-renders its component on every change.
 */
export interface PaneScaffoldNavigator<T, Pane extends string> {
  /** The m3e-motion navigator underneath (pass it to the scaffold). */
  readonly navigator: ThreePaneScaffoldNavigator<T>;
  readonly scaffoldValue: ThreePaneScaffoldValue;
  readonly currentDestination: ThreePaneScaffoldDestinationItem<T> | null;
  readonly destinationHistory: readonly ThreePaneScaffoldDestinationItem<T>[];
  /** navigateTo: a pane name or a ThreePaneScaffoldRole. */
  navigateTo(pane: Pane | ThreePaneScaffoldRole, contentKey?: T): void;
  navigateBack(behavior?: BackNavigationBehavior): boolean;
  canNavigateBack(behavior?: BackNavigationBehavior): boolean;
  /** Whether the pane is expanded (shown side by side), as the Compose samples check. */
  isExpanded(pane: Pane | ThreePaneScaffoldRole): boolean;
}

export type ListDetailPaneScaffoldNavigator<T = unknown> = PaneScaffoldNavigator<T, ListDetailPane>;
export type SupportingPaneScaffoldNavigator<T = unknown> = PaneScaffoldNavigator<T, SupportingPane>;

/** Options of the navigator hooks (Compose rememberListDetailPaneScaffoldNavigator's). */
export type PaneScaffoldNavigatorHookOptions<T> = Omit<PaneScaffoldNavigatorOptions<T>, 'paneRule'>;

function usePaneScaffoldNavigator<T, Pane extends string>(
  variant: PaneScaffoldVariant,
  options: PaneScaffoldNavigatorHookOptions<T>,
): PaneScaffoldNavigator<T, Pane> {
  const [navigator] = useState(() => createPaneScaffoldNavigator<T>(variant, options));
  const version = useRef(0);
  const [subscribe] = useState(
    () => (onChange: () => void) =>
      navigator.subscribe(() => {
        version.current++;
        onChange();
      }),
  );
  useSyncExternalStore(subscribe, () => version.current);
  const role = (pane: string) => paneScaffoldRole(variant, pane);
  return {
    navigator,
    scaffoldValue: navigator.scaffoldValue,
    currentDestination: navigator.currentDestination,
    destinationHistory: navigator.destinationHistory,
    navigateTo: (pane, contentKey) => {
      const r = role(pane);
      if (r) navigator.navigateTo(r, contentKey);
    },
    navigateBack: (behavior) => navigator.navigateBack(behavior),
    canNavigateBack: (behavior) => navigator.canNavigateBack(behavior),
    isExpanded: (pane) => {
      const r = role(pane);
      return r !== null && navigator.scaffoldValue[r] === 'expanded';
    },
  };
}

/**
 * rememberListDetailPaneScaffoldNavigator: the list first (Compose's default history); pass the
 * result to `<ListDetailPaneScaffold navigator>`.
 */
export function useListDetailPaneScaffoldNavigator<T = unknown>(
  options: PaneScaffoldNavigatorHookOptions<T> = {},
): ListDetailPaneScaffoldNavigator<T> {
  return usePaneScaffoldNavigator<T, ListDetailPane>('list-detail', options);
}

/** rememberSupportingPaneScaffoldNavigator: the main pane first. */
export function useSupportingPaneScaffoldNavigator<T = unknown>(
  options: PaneScaffoldNavigatorHookOptions<T> = {},
): SupportingPaneScaffoldNavigator<T> {
  return usePaneScaffoldNavigator<T, SupportingPane>('supporting-pane', options);
}

interface PaneScaffoldBaseProps<Pane extends string> extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'children'
> {
  /** Pane region names (default Compose's "Primary pane" / "Secondary pane" / "Tertiary pane"). */
  paneLabels?: Partial<Record<Pane, string>> | undefined;
  /**
   * `recommended` (default: m3.material.io, two panes at large, three from 1600px) or `compose`
   * (Compose's calculatePaneScaffoldDirective: three panes from large, 1200px).
   */
  paneRule?: PaneRule | undefined;
  /** A pane expansion drag handle between two expanded panes (Compose paneExpansionDragHandle). */
  hasDragHandle?: boolean | undefined;
  /** Anchors the drag handle snaps to (default: the Compose samples' anchors). */
  anchors?: readonly PaneExpansionAnchor[] | undefined;
  /** PaneScaffoldScope.preferredWidth per pane (px). */
  preferredWidths?: Partial<Record<Pane, number>> | undefined;
}

interface PaneScaffoldProps<Pane extends string> extends PaneScaffoldBaseProps<Pane> {
  variant: PaneScaffoldVariant;
  navigator: PaneScaffoldNavigator<unknown, Pane> | undefined;
  panes: Partial<Record<Pane, ReactNode>>;
}

const S = 'm3e-pane-scaffold';

const PaneScaffold = /* @__PURE__ */ forwardRef(function PaneScaffold<Pane extends string>(
  {
    variant,
    navigator: handle,
    panes,
    paneLabels,
    paneRule = 'recommended',
    hasDragHandle = false,
    anchors,
    preferredWidths,
    className,
    ...rest
  }: PaneScaffoldProps<Pane>,
  forwardedRef: ForwardedRef<HTMLDivElement>,
) {
  const ref = useObjectRef(forwardedRef);
  const scaffoldRef = useRef<HTMLDivElement>(null);
  const [own] = useState(() => createPaneScaffoldNavigator(variant, { paneRule }));
  const navigator = handle?.navigator ?? own;
  const layoutRef = useRef<PaneScaffoldLayout | null>(null);
  const options = {
    variant,
    paneRule,
    anchors,
    motion: { ThreePaneScaffoldAnimation, calculatePaneMotion, paneTransitions },
    expansion: attachPaneExpansion,
  };
  useLayoutEffect(() => {
    const el = scaffoldRef.current;
    if (!el) return undefined;
    const layout = new PaneScaffoldLayout(el, options, navigator);
    layoutRef.current = layout;
    return () => {
      layout.destroy();
      layoutRef.current = null;
    };
    // One layout per navigator; options are synced below.
  }, [navigator]);
  useLayoutEffect(() => {
    layoutRef.current?.setOptions(options);
  });

  const names = Object.entries(PANE_SCAFFOLD_PANE_NAMES[variant]) as [
    Pane,
    ThreePaneScaffoldRole,
  ][];
  const nameOf = (role: ThreePaneScaffoldRole) =>
    (names.find(([, r]) => r === role)?.[0] ?? role) as Pane;
  const roles = paneScaffoldOrder(variant).filter(
    (r) => r !== 'tertiary' || (panes[nameOf(r)] !== undefined && panes[nameOf(r)] !== null),
  );
  return (
    <div {...rest} ref={ref} className={cx('m3e-layout', className)}>
      <div
        ref={scaffoldRef}
        className={cx(S, `${S}--${variant}`, paneRule === 'compose' && `${S}--compose`)}
      >
        {roles.map((role) => {
          const name = nameOf(role);
          const width = preferredWidths?.[name];
          return (
            <div
              key={role}
              className={`${S}__pane ${S}__pane--${role}`}
              role="region"
              aria-label={paneLabels?.[name] ?? PANE_SCAFFOLD_PANE_TITLES[role]}
              tabIndex={-1}
              style={
                width === undefined
                  ? undefined
                  : ({
                      '--m3e-comp-pane-scaffold-pane-preferred-width': `${String(width)}px`,
                    } as CSSProperties)
              }
            >
              {panes[name]}
            </div>
          );
        })}
        {hasDragHandle ? (
          <div
            key="drag-handle"
            className={`${S}__drag-handle`}
            role="separator"
            aria-orientation="vertical"
            aria-label={PANE_EXPANSION_DRAG_HANDLE_LABEL}
            tabIndex={0}
          >
            <span className="m3e-vertical-drag-handle" />
          </div>
        ) : null}
      </div>
    </div>
  );
}) as <Pane extends string>(
  props: PaneScaffoldProps<Pane> & { ref?: ForwardedRef<HTMLDivElement> },
) => ReactNode;

export interface ListDetailPaneScaffoldProps extends PaneScaffoldBaseProps<ListDetailPane> {
  /** From `useListDetailPaneScaffoldNavigator()`; default: one of its own. */
  navigator?: ListDetailPaneScaffoldNavigator<any> | undefined; // eslint-disable-line @typescript-eslint/no-explicit-any
  /** The list pane (Compose `listPane`, ThreePaneScaffoldRole.Secondary). */
  listPane: ReactNode;
  /** The detail pane (Compose `detailPane`, Primary). */
  detailPane: ReactNode;
  /** An optional extra pane (Compose `extraPane`, Tertiary). */
  extraPane?: ReactNode;
}

/**
 * List-detail canonical layout (COMPONENT_SPEC §16a; Compose `ListDetailPaneScaffold`): the list
 * alone below 840px of the layout's own width (the detail after `navigateTo('detail')`, back
 * with `navigateBack()`), list and detail from 840px, list, detail and extra from 1600px
 * (m3.material.io; `paneRule="compose"`: from 1200px, Compose's calculatePaneScaffoldDirective). Panes move on Compose's pane motion and focus follows
 * the destination (m3e-elements' PaneScaffoldLayout, the code `<m3e-list-detail-layout>` runs).
 * Elements with `data-pane-navigate="detail"` / `"back"` inside navigate on click. Other props go
 * to the `.m3e-layout` root (the size container); give it a height.
 */
export const ListDetailPaneScaffold = /* @__PURE__ */ forwardRef(function ListDetailPaneScaffold(
  { navigator, listPane, detailPane, extraPane, ...rest }: ListDetailPaneScaffoldProps,
  ref: ForwardedRef<HTMLDivElement>,
) {
  return (
    <PaneScaffold<ListDetailPane>
      {...rest}
      ref={ref}
      variant="list-detail"
      navigator={navigator}
      panes={{ list: listPane, detail: detailPane, extra: extraPane }}
    />
  );
});

export interface SupportingPaneScaffoldProps extends PaneScaffoldBaseProps<SupportingPane> {
  /** From `useSupportingPaneScaffoldNavigator()`; default: one of its own. */
  navigator?: SupportingPaneScaffoldNavigator<any> | undefined; // eslint-disable-line @typescript-eslint/no-explicit-any
  /** The main pane (Compose `mainPane`, Primary). */
  mainPane: ReactNode;
  /** The supporting pane (Compose `supportingPane`, Secondary). */
  supportingPane: ReactNode;
  /** An optional extra pane (Compose `extraPane`, Tertiary). */
  extraPane?: ReactNode;
}

/**
 * Supporting-pane canonical layout (COMPONENT_SPEC §16a; Compose `SupportingPaneScaffold`): the
 * main pane alone below 840px (the supporting pane reflows under it when the layout is at least
 * 900px tall), main and supporting from 840px, all three from 1600px (`paneRule="compose"`:
 * from 1200px). Same behavior as `ListDetailPaneScaffold`.
 */
export const SupportingPaneScaffold = /* @__PURE__ */ forwardRef(function SupportingPaneScaffold(
  { navigator, mainPane, supportingPane, extraPane, ...rest }: SupportingPaneScaffoldProps,
  ref: ForwardedRef<HTMLDivElement>,
) {
  return (
    <PaneScaffold<SupportingPane>
      {...rest}
      ref={ref}
      variant="supporting-pane"
      navigator={navigator}
      panes={{ main: mainPane, supporting: supportingPane, extra: extraPane }}
    />
  );
});
