import type { MenuAnchorPosition } from '@kyralabs/m3e-motion';
import {
  Children,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
  cloneElement,
  isValidElement,
  useMemo,
  useRef,
} from 'react';
import { type PressEvent, chain, mergeRefs, useId } from 'react-aria';
import { useMenuTriggerState } from 'react-stately';
import { defined } from '../utils/cx.js';
import { MenuPopupContext, type MenuPopupContextValue } from './context.js';

export interface MenuTriggerProps {
  /**
   * Two children: the trigger (a component that takes `onPress`, `onKeyDown`, ARIA props and a ref,
   * such as `<Button>` or `<IconButton>`) and the `<Menu>`.
   */
  children: [ReactElement, ReactElement] | ReactNode;
  isOpen?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  /** Where the menu opens. Default `below` (flips above when there is no room). */
  position?: MenuAnchorPosition;
  isDisabled?: boolean;
}

interface TriggerElementProps {
  ref?: Ref<HTMLElement>;
  onPress?: (e: PressEvent) => void;
  onKeyDown?: (e: KeyboardEvent) => void;
}

/**
 * Opens a `<Menu>` from a button (COMPONENT_SPEC §21; APG menu button). A press opens it; from the
 * keyboard, Enter, Space and ArrowDown open it on the first item and ArrowUp on the last. The
 * trigger gets `aria-haspopup`, `aria-expanded` and, while open, `aria-controls`. Opening follows
 * Compose's IconButton `onClick` (on release), not React Aria's press start.
 */
export function MenuTrigger({
  children,
  isOpen,
  defaultOpen,
  onOpenChange,
  position = 'below',
  isDisabled = false,
}: MenuTriggerProps): ReactNode {
  const state = useMenuTriggerState(defined({ isOpen, defaultOpen, onOpenChange }));
  const anchorRef = useRef<HTMLElement | null>(null);
  const menuId = useId();
  const triggerId = useId();
  const [trigger, menu] = Children.toArray(children) as [ReactElement, ReactElement];

  const context = useMemo<MenuPopupContextValue>(
    () => ({
      isOpen: state.isOpen,
      focusStrategy:
        state.focusStrategy === 'first' || state.focusStrategy === 'last'
          ? state.focusStrategy
          : null,
      close: state.close,
      closeAll: state.close,
      rootState: state,
      anchorRef,
      menuId,
      labelledBy: triggerId,
      position,
      parentPopup: null,
    }),
    [state, menuId, triggerId, position],
  );

  if (!isValidElement<TriggerElementProps>(trigger)) return children as ReactNode;
  const triggerProps = trigger.props;
  // React 19 passes `ref` as a prop; React 18 keeps it on the element.
  const childRef =
    triggerProps.ref ?? (trigger as unknown as { ref?: Ref<HTMLElement> | undefined }).ref;
  const onPress = (e: PressEvent) => {
    if (isDisabled || e.pointerType === 'keyboard') return;
    state.toggle(e.pointerType === 'virtual' ? 'first' : null);
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (isDisabled) return;
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      state.toggle(e.key === 'ArrowUp' ? 'last' : 'first');
    }
  };
  return (
    <MenuPopupContext.Provider value={context}>
      {cloneElement(trigger, {
        ref: mergeRefs(childRef, anchorRef),
        id: triggerId,
        'aria-haspopup': 'true',
        'aria-expanded': state.isOpen ? 'true' : 'false',
        'aria-controls': state.isOpen ? menuId : undefined,
        onPress: chain(triggerProps.onPress, onPress),
        onKeyDown: chain(triggerProps.onKeyDown, onKeyDown),
      } as TriggerElementProps & Record<string, unknown>)}
      {menu}
    </MenuPopupContext.Provider>
  );
}
