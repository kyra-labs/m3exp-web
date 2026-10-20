// m3e-elements is bundled (a devDependency), so the public types are declared here, keeping the
// published d.ts free of m3e-elements imports.
import { SearchLayout } from '@kyralabs/m3e-elements/search-layout.js';
import {
  type ForwardedRef,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  createContext,
  forwardRef,
  isValidElement,
  useCallback,
  useContext,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useObjectRef } from 'react-aria';
import { Icon } from '../icon/Icon.js';
import { cx } from '../utils/cx.js';
import { warnDeprecatedProp } from '../utils/deprecated.js';

/**
 * The expanded view (Compose: which Expanded*SearchBar the state is shown with):
 * `full-screen` (ExpandedFullScreenSearchBar), `full-screen-contained`
 * (ExpandedFullScreenContainedSearchBar), `docked` (ExpandedDockedSearchBar), `docked-with-gap`
 * (ExpandedDockedSearchBarWithGap).
 */
export type SearchBarVariant =
  'full-screen' | 'full-screen-contained' | 'docked' | 'docked-with-gap';

interface ResultRecord {
  value: string;
  label: string;
}

/** SearchResult → its value and label, for the shared SearchLayout's `onSelect`. */
const ResultsContext = /* @__PURE__ */ createContext<Map<Element, ResultRecord> | null>(null);

const textOf = (node: ReactNode): string =>
  typeof node === 'string' || typeof node === 'number'
    ? String(node)
    : Array.isArray(node)
      ? node.map(textOf).join('')
      : isValidElement<{ children?: ReactNode }>(node)
        ? textOf(node.props.children)
        : '';

const icon = (value: string | ReactElement) =>
  typeof value === 'string' ? <Icon name={value} /> : value;

export interface SearchResultProps {
  /** Passed to `onSelect`. Default: the label text. */
  value?: string;
  /** The label (ListItem content). */
  children: ReactNode;
  /** The label as plain text, when `children` is not a string (what the input takes on select). */
  textValue?: string;
  /** Leading icon: a Material Symbols name or an `<Icon>`. */
  icon?: string | ReactElement;
  /** Second line (bodyMedium). */
  supportingText?: ReactNode;
  /** Trailing icon: a Material Symbols name or an `<Icon>`. */
  trailingIcon?: string | ReactElement;
  isDisabled?: boolean;
}

/**
 * One result of a `<SearchBar>` (the rows of the Compose samples' SampleSearchResults): a
 * `role="option"` of the results listbox. Selected with a click, or ArrowDown / ArrowUp and Enter
 * from the input (virtual focus).
 */
export const SearchResult = /* @__PURE__ */ forwardRef(function SearchResult(
  {
    value,
    children,
    textValue,
    icon: leading,
    supportingText,
    trailingIcon,
    isDisabled,
  }: SearchResultProps,
  forwardedRef: ForwardedRef<HTMLDivElement>,
) {
  const id = useId();
  const registry = useContext(ResultsContext);
  const label = textValue ?? textOf(children).trim();
  const ref = useObjectRef(forwardedRef);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !registry) return;
    registry.set(el, { value: value ?? label, label });
    return () => {
      registry.delete(el);
    };
  }, [registry, ref, value, label]);
  return (
    <div
      ref={ref}
      className="m3e-search__result"
      role="option"
      id={id}
      aria-disabled={isDisabled ? 'true' : undefined}
    >
      {leading !== undefined && <span className="m3e-search__result-leading">{icon(leading)}</span>}
      <span className="m3e-search__result-text">
        <span className="m3e-search__result-label">{children}</span>
        {supportingText !== undefined && (
          <span className="m3e-search__result-supporting">{supportingText}</span>
        )}
      </span>
      {trailingIcon !== undefined && (
        <span className="m3e-search__result-trailing">{icon(trailingIcon)}</span>
      )}
    </div>
  );
});

export interface SearchBarProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'children' | 'onChange' | 'onSelect' | 'defaultValue' | 'role'
> {
  /** Default `full-screen`. */
  variant?: SearchBarVariant;
  /** The query (controlled). */
  value?: string;
  /** The initial query (uncontrolled). */
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Enter without an active result. Return `false` to stay expanded (default: collapse). */
  onSearch?: (value: string) => unknown;
  /**
   * A result was activated. Return `false` to stay expanded and keep the query; by default the
   * query becomes the result's label and the view collapses (the Compose samples).
   */
  onSelect?: (value: string, label: string) => unknown;
  /** Controlled expanded state (SearchBarState.targetValue). */
  isExpanded?: boolean;
  /**
   * Controlled expanded state.
   * @deprecated Since 1.8: use `isExpanded`. Removed in 2.0.
   */
  expanded?: boolean;
  /** Uncontrolled initial state. Default `false`. */
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  placeholder?: string;
  /** The input's accessible name. Default "Search" (Compose Strings.SearchBarSearch). */
  'aria-label'?: string;
  /** The results listbox's accessible name. Default "Suggestions". */
  resultsLabel?: string;
  /** Collapsed leading icon: a Material Symbols name or an `<Icon>`. Default `search`. */
  leadingIcon?: string | ReactElement;
  /** The expanded view's back button label. Default "Back". */
  backLabel?: string;
  /** Trailing content: `<IconButton>`s, an `<img className="m3e-search__avatar">`. */
  trailing?: ReactNode;
  isDisabled?: boolean;
  /** `<SearchResult>`s. */
  children?: ReactNode;
}

/**
 * Search (COMPONENT_SPEC §12; Compose SearchBar + SearchBarDefaults.InputField with one of the
 * Expanded*SearchBar views): the `.m3e-search` contract, `role="search"` around a combobox input
 * and a listbox of `<SearchResult>`s. On the web the collapsed bar and its expanded view are one
 * element (the view moves into the top layer), so one component takes a `variant`. Behavior comes
 * from m3e-elements' SearchLayout, the same code `<m3e-search>` runs: expand / collapse on the
 * variant's springs, the combobox (virtual focus, as React Aria's useComboBox), light dismiss and
 * the full-screen focus trap (React Aria's useComboBox state closes on blur and selection, which
 * Compose's expanded view does not).
 */
export const SearchBar = /* @__PURE__ */ forwardRef(function SearchBar(
  props: SearchBarProps,
  forwardedRef: ForwardedRef<HTMLDivElement>,
) {
  const {
    variant = 'full-screen',
    value: valueProp,
    defaultValue = '',
    onChange,
    onSearch,
    onSelect,
    isExpanded,
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- the 1.x alias (D16)
    expanded: legacyExpanded,
    defaultExpanded = false,
    onExpandedChange,
    placeholder,
    'aria-label': label = 'Search',
    resultsLabel = 'Suggestions',
    leadingIcon = 'search',
    backLabel = 'Back',
    trailing,
    isDisabled = false,
    children,
    className,
    ...rest
  } = props;
  if (legacyExpanded !== undefined) {
    warnDeprecatedProp('SearchBar expanded', 'SearchBar isExpanded');
  }
  const expandedProp = isExpanded ?? legacyExpanded;
  const ref = useObjectRef(forwardedRef);
  const inputId = useId();
  const resultsId = useId();
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const value = valueProp ?? uncontrolledValue;
  const [uncontrolledExpanded, setUncontrolledExpanded] = useState(defaultExpanded);
  const expanded = expandedProp ?? uncontrolledExpanded;
  const registry = useMemo(() => new Map<Element, ResultRecord>(), []);

  const setValue = useCallback(
    (next: string) => {
      if (valueProp === undefined) setUncontrolledValue(next);
      onChange?.(next);
    },
    [valueProp, onChange],
  );

  // The latest callbacks, for the long-lived SearchLayout.
  const handlers = useRef({ onSearch, onSelect, onExpandedChange, setValue, expandedProp });
  handlers.current = { onSearch, onSelect, onExpandedChange, setValue, expandedProp };
  const layoutRef = useRef<SearchLayout | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!layoutRef.current) {
      layoutRef.current = new SearchLayout(el, {
        onExpandedChange: (next) => {
          if (handlers.current.expandedProp === undefined) setUncontrolledExpanded(next);
          handlers.current.onExpandedChange?.(next);
        },
        onSearch: (query) => handlers.current.onSearch?.(query),
        onSelect: (option) => {
          const record = registry.get(option);
          const label = record?.label ?? option.textContent.trim();
          if (handlers.current.onSelect?.(record?.value ?? label, label) === false) return false;
          handlers.current.setValue(label);
          return undefined;
        },
      });
      if (expanded) layoutRef.current.setExpanded(true, false);
    }
    layoutRef.current.update();
  });
  // Controlled `expanded`: animate to it.
  useLayoutEffect(() => {
    const layout = layoutRef.current;
    if (layout && expandedProp !== undefined && layout.expanded !== expandedProp) {
      layout.setExpanded(expandedProp);
    }
  }, [expandedProp]);
  useLayoutEffect(
    () => () => {
      layoutRef.current?.destroy();
      layoutRef.current = null;
    },
    [],
  );

  return (
    <div
      {...rest}
      ref={ref}
      className={cx('m3e-search', variant !== 'full-screen' && `m3e-search--${variant}`, className)}
      role="search"
      aria-label={label}
    >
      <div className="m3e-search__view">
        <div className="m3e-search__field">
          <span className="m3e-search__leading">
            {expanded ? (
              <button
                type="button"
                className="m3e-icon-button m3e-search__back"
                aria-label={backLabel}
              >
                <Icon name="arrow_back" />
              </button>
            ) : (
              icon(leadingIcon)
            )}
          </span>
          <input
            className="m3e-search__input"
            type="text"
            role="combobox"
            aria-autocomplete="list"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            id={inputId}
            aria-label={label}
            placeholder={placeholder}
            disabled={isDisabled}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
            }}
          />
          {trailing !== undefined && trailing !== null && (
            <span className="m3e-search__trailing">{trailing}</span>
          )}
        </div>
        <div
          className="m3e-search__results"
          role="listbox"
          id={resultsId}
          tabIndex={-1}
          aria-label={resultsLabel}
        >
          <ResultsContext.Provider value={registry}>{children}</ResultsContext.Provider>
        </div>
      </div>
    </div>
  );
});
