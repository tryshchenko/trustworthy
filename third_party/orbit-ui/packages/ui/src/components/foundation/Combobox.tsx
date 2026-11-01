import { Check, ChevronDown, Search } from "@orbit/icons";
import { Popover as RP } from "radix-ui";
import {
  forwardRef,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { usePortalContainer } from "../../theme/ThemeProvider";
import { cn } from "../../utils/cn";
import { useControllableState } from "../../utils/use-controllable-state";
import { useFieldControl } from "./Form";

export interface ListOption {
  value: string;
  /** Plain-text label; also used for filtering. */
  label: string;
  description?: string;
  icon?: ReactNode;
  /** Extra search terms. */
  keywords?: string[];
  disabled?: boolean;
  /** Optional group heading. Options with the same group render together. */
  group?: string;
}

/** Default filter: every whitespace-separated term must match label, description or keywords. */
export function defaultFilter(option: ListOption, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = [option.label, option.description, ...(option.keywords ?? [])]
    .join(" ")
    .toLowerCase();
  return q.split(/\s+/).every((term) => hay.includes(term));
}

/* -------------------------------------------------------------- SearchList */

export interface SearchListProps {
  options: ListOption[];
  /** Values to mark `aria-selected`. */
  selected?: string[];
  onSelect: (option: ListOption) => void;
  placeholder?: string;
  /** Accessible name of the search input. */
  inputLabel: string;
  emptyMessage?: ReactNode;
  filter?: (option: ListOption, query: string) => boolean;
  query?: string;
  onQueryChange?: (query: string) => void;
  /** Render custom option content. */
  renderOption?: (option: ListOption, state: { active: boolean; selected: boolean }) => ReactNode;
  /** Extra footer content (e.g. "Create …" action). */
  footer?: ReactNode;
  autoFocus?: boolean;
  className?: string;
  maxHeight?: number;
  /** Called on Escape when the list is not inside a popover. */
  onEscape?: () => void;
  /** Mark the listbox as multi-select. */
  multiple?: boolean;
}

/**
 * Searchable listbox implementing the ARIA combobox pattern (input + listbox with
 * `aria-activedescendant`). Foundation for Combobox, selectors and CommandPalette.
 */
export function SearchList({
  options,
  selected = [],
  onSelect,
  placeholder = "Search…",
  inputLabel,
  emptyMessage = "No results",
  filter = defaultFilter,
  query: queryProp,
  onQueryChange,
  renderOption,
  footer,
  autoFocus = true,
  className,
  maxHeight = 300,
  onEscape,
  multiple,
}: SearchListProps) {
  const [query, setQuery] = useControllableState(queryProp, "", onQueryChange);
  const baseId = useId();
  const listId = `${baseId}-list`;
  const visible = useMemo(() => options.filter((o) => filter(o, query)), [options, filter, query]);
  const enabled = useMemo(() => visible.filter((o) => !o.disabled), [visible]);
  const [activeValue, setActiveValue] = useState<string | undefined>(undefined);
  const listRef = useRef<HTMLDivElement>(null);

  // Keep the active option valid as the list changes.
  const active = enabled.find((o) => o.value === activeValue) ?? enabled[0];
  const optionId = (v: string) => `${baseId}-opt-${v.replace(/[^\w-]/g, "_")}`;

  useEffect(() => {
    if (!active) return;
    document.getElementById(optionId(active.value))?.scrollIntoView({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.value]);

  const move = (delta: number | "start" | "end") => {
    if (!enabled.length) return;
    const i = active ? enabled.indexOf(active) : -1;
    const next =
      delta === "start"
        ? 0
        : delta === "end"
          ? enabled.length - 1
          : (i + delta + enabled.length) % enabled.length;
    setActiveValue(enabled[next]?.value);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        move(1);
        break;
      case "ArrowUp":
        e.preventDefault();
        move(-1);
        break;
      case "Home":
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          move("start");
        }
        break;
      case "End":
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          move("end");
        }
        break;
      case "Enter":
        if (active) {
          e.preventDefault();
          onSelect(active);
        }
        break;
      case "Escape":
        if (onEscape) {
          e.preventDefault();
          onEscape();
        }
        break;
    }
  };

  // Group options while preserving order.
  const groups = useMemo(() => {
    const map = new Map<string, ListOption[]>();
    for (const o of visible) {
      const key = o.group ?? "";
      map.set(key, [...(map.get(key) ?? []), o]);
    }
    return [...map.entries()];
  }, [visible]);

  return (
    <div className={cn("orb-searchlist", className)}>
      <div className="orb-searchlist__search">
        <Search size={15} aria-hidden />
        <input
          role="combobox"
          aria-label={inputLabel}
          aria-expanded="true"
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active ? optionId(active.value) : undefined}
          className="orb-searchlist__input"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveValue(undefined);
          }}
          onKeyDown={onKeyDown}
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus={autoFocus}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      <div
        ref={listRef}
        id={listId}
        role="listbox"
        aria-label={inputLabel}
        aria-multiselectable={multiple || undefined}
        className="orb-searchlist__list"
        style={{ maxHeight }}
      >
        {visible.length === 0 && (
          <div className="orb-searchlist__empty" role="presentation">
            {emptyMessage}
          </div>
        )}
        {groups.map(([group, items]) => (
          <div
            key={group || "_"}
            role={group ? "group" : "presentation"}
            aria-label={group || undefined}
          >
            {group && (
              <div className="orb-menu__label" aria-hidden>
                {group}
              </div>
            )}
            {items.map((o) => {
              const isSelected = selected.includes(o.value);
              const isActive = active?.value === o.value;
              return (
                // Options are navigated via aria-activedescendant from the input, so they are intentionally not focusable.
                // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus
                <div
                  key={o.value}
                  id={optionId(o.value)}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={o.disabled || undefined}
                  data-active={isActive || undefined}
                  className="orb-menu__item orb-menu__item--check"
                  onMouseMove={() => !o.disabled && setActiveValue(o.value)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => !o.disabled && onSelect(o)}
                >
                  {renderOption ? (
                    renderOption(o, { active: isActive, selected: isSelected })
                  ) : (
                    <>
                      <span className="orb-menu__indicator" aria-hidden>
                        {isSelected && <Check size={12} strokeWidth={2.5} />}
                      </span>
                      {o.icon && (
                        <span className="orb-menu__icon" aria-hidden>
                          {o.icon}
                        </span>
                      )}
                      <span className="orb-menu__text">
                        {o.label}
                        {o.description && (
                          <span className="orb-menu__description">{o.description}</span>
                        )}
                      </span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {footer && <div className="orb-searchlist__footer">{footer}</div>}
      <span className="orb-sr-only" aria-live="polite">
        {query ? `${visible.length} result${visible.length === 1 ? "" : "s"}` : ""}
      </span>
    </div>
  );
}

/* ---------------------------------------------------------------- Combobox */

interface ComboboxBaseProps {
  options: ListOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: ReactNode;
  disabled?: boolean;
  invalid?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  id?: string;
  "aria-label"?: string;
  /** Replace the default trigger with a custom element (rendered with `asChild`). */
  trigger?: ReactNode;
  renderOption?: SearchListProps["renderOption"];
  /** Render the selected value(s) inside the default trigger. */
  renderValue?: (selected: ListOption[]) => ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  align?: "start" | "center" | "end";
  appearance?: "default" | "ghost";
  footer?: ReactNode;
}

export interface ComboboxSingleProps extends ComboboxBaseProps {
  multiple?: false;
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
  /** Allow clearing by re-selecting the current value. */
  clearable?: boolean;
}

export interface ComboboxMultipleProps extends ComboboxBaseProps {
  multiple: true;
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
}

export type ComboboxProps = ComboboxSingleProps | ComboboxMultipleProps;

/** Searchable single- or multi-select. */
export const Combobox = forwardRef<HTMLButtonElement, ComboboxProps>(function Combobox(props, ref) {
  const {
    options,
    placeholder = "Select…",
    searchPlaceholder = "Search…",
    emptyMessage,
    disabled,
    invalid,
    size = "md",
    className,
    trigger,
    renderOption,
    renderValue,
    align = "start",
    appearance = "default",
    footer,
  } = props;
  const container = usePortalContainer();
  const [open, setOpen] = useControllableState(props.open, false, props.onOpenChange);
  const [single, setSingle] = useControllableState<string | null>(
    props.multiple ? undefined : props.value,
    props.multiple ? null : (props.defaultValue ?? null),
    props.multiple ? undefined : props.onValueChange,
  );
  const [many, setMany] = useControllableState<string[]>(
    props.multiple ? props.value : undefined,
    props.multiple ? (props.defaultValue ?? []) : [],
    props.multiple ? props.onValueChange : undefined,
  );
  const selectedValues = props.multiple ? many : single ? [single] : [];
  const selectedOptions = options.filter((o) => selectedValues.includes(o.value));
  const a11y = useFieldControl({ id: props.id, "aria-invalid": invalid || undefined, disabled });

  const onSelect = (o: ListOption) => {
    if (props.multiple) {
      setMany(many.includes(o.value) ? many.filter((v) => v !== o.value) : [...many, o.value]);
    } else {
      setSingle(single === o.value && props.clearable ? null : o.value);
      setOpen(false);
    }
  };

  const label = props["aria-label"];
  return (
    <RP.Root open={open} onOpenChange={setOpen}>
      <RP.Trigger asChild disabled={a11y.disabled}>
        {trigger ?? (
          <button
            ref={ref}
            type="button"
            id={a11y.id}
            aria-label={label}
            aria-haspopup="listbox"
            aria-describedby={a11y["aria-describedby"]}
            className={cn(
              "orb-select",
              `orb-input--${size}`,
              appearance === "ghost" && "orb-select--ghost",
              a11y["aria-invalid"] && "orb-input--invalid",
              className,
            )}
          >
            <span
              className={cn(
                "orb-select__value",
                !selectedOptions.length && "orb-select__placeholder",
              )}
            >
              {selectedOptions.length
                ? renderValue
                  ? renderValue(selectedOptions)
                  : selectedOptions.map((o) => o.label).join(", ")
                : placeholder}
            </span>
            <ChevronDown size={14} aria-hidden className="orb-select__icon" />
          </button>
        )}
      </RP.Trigger>
      <RP.Portal container={container}>
        <RP.Content
          className="orb-popover orb-popover--glass orb-pad-none orb-combobox__content"
          sideOffset={6}
          align={align}
          collisionPadding={8}
        >
          <SearchList
            options={options}
            selected={selectedValues}
            onSelect={onSelect}
            placeholder={searchPlaceholder}
            inputLabel={label ?? searchPlaceholder}
            emptyMessage={emptyMessage}
            renderOption={renderOption}
            footer={footer}
            multiple={props.multiple}
          />
        </RP.Content>
      </RP.Portal>
    </RP.Root>
  );
});
