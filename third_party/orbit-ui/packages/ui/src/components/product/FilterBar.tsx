import { ChevronDown, Search, X } from "@orbit/icons";
import { Popover as RP } from "radix-ui";
import { useState, type HTMLAttributes, type ReactNode, type Ref } from "react";
import { usePortalContainer } from "../../theme/ThemeProvider";
import { cn } from "../../utils/cn";
import { SearchList, type ListOption } from "../foundation/Combobox";
import { Input } from "../foundation/Form";

export interface FilterDefinition {
  id: string;
  label: string;
  options: ListOption[];
  value: string[];
  icon?: ReactNode;
}

export interface FilterBarProps extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
  query?: string;
  onQueryChange?: (query: string) => void;
  searchPlaceholder?: string;
  /** Accessible label of the search field. */
  searchLabel?: string;
  filters?: FilterDefinition[];
  onFilterChange?: (filterId: string, value: string[]) => void;
  /** Shown when any query/filter is active. */
  onClearAll?: () => void;
  /** Leading slot (e.g. avatar quick filters). */
  leading?: ReactNode;
  /** Trailing slot (e.g. group-by or view options). */
  actions?: ReactNode;
  /** Live result count, announced politely to screen readers. */
  resultCount?: number;
  /** Ref to the search `<input>`, e.g. to focus it from a "/" shortcut. */
  searchInputRef?: Ref<HTMLInputElement>;
}

function FilterChip({
  filter,
  onChange,
}: {
  filter: FilterDefinition;
  onChange: (v: string[]) => void;
}) {
  const container = usePortalContainer();
  const [open, setOpen] = useState(false);
  const active = filter.value.length > 0;
  const summary = active
    ? filter.value.length === 1
      ? filter.options.find((o) => o.value === filter.value[0])?.label
      : `${filter.value.length} selected`
    : undefined;
  return (
    <RP.Root open={open} onOpenChange={setOpen}>
      <RP.Trigger asChild>
        <button
          type="button"
          className={cn("orb-filter-chip", active && "orb-filter-chip--active")}
          aria-label={`${filter.label}${summary ? `: ${summary}` : ""}`}
        >
          {filter.icon && <span aria-hidden>{filter.icon}</span>}
          <span>{filter.label}</span>
          {summary && <span className="orb-filter-chip__value">{summary}</span>}
          <ChevronDown size={13} aria-hidden />
        </button>
      </RP.Trigger>
      <RP.Portal container={container}>
        <RP.Content
          className="orb-popover orb-popover--glass orb-pad-none orb-combobox__content"
          sideOffset={6}
          align="start"
          collisionPadding={8}
        >
          <SearchList
            options={filter.options}
            selected={filter.value}
            multiple
            inputLabel={`Filter by ${filter.label.toLowerCase()}`}
            placeholder={`Filter ${filter.label.toLowerCase()}…`}
            onSelect={(o) =>
              onChange(
                filter.value.includes(o.value)
                  ? filter.value.filter((v) => v !== o.value)
                  : [...filter.value, o.value],
              )
            }
            footer={
              active && (
                <button
                  type="button"
                  className="orb-menu__item orb-searchlist__action"
                  onClick={() => onChange([])}
                >
                  Clear {filter.label.toLowerCase()} filter
                </button>
              )
            }
          />
        </RP.Content>
      </RP.Portal>
    </RP.Root>
  );
}

/** Search + facet filters + clear-all, wrapping gracefully on small screens. */
export function FilterBar({
  query = "",
  onQueryChange,
  searchPlaceholder = "Search this board",
  searchLabel = "Search issues",
  filters = [],
  onFilterChange,
  onClearAll,
  leading,
  actions,
  resultCount,
  searchInputRef,
  className,
  ...props
}: FilterBarProps) {
  const anyActive = query.length > 0 || filters.some((f) => f.value.length > 0);
  return (
    <div className={cn("orb-filterbar", className)} role="search" {...props}>
      {onQueryChange && (
        <Input
          ref={searchInputRef}
          className="orb-filterbar__search"
          size="sm"
          aria-label={searchLabel}
          placeholder={searchPlaceholder}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && query && (e.preventDefault(), onQueryChange(""))}
          leading={<Search size={15} />}
          trailing={
            query ? (
              <button
                type="button"
                className="orb-input__clear"
                aria-label="Clear search"
                onClick={() => onQueryChange("")}
              >
                <X size={13} aria-hidden />
              </button>
            ) : undefined
          }
        />
      )}
      {leading}
      {filters.map((f) => (
        <FilterChip key={f.id} filter={f} onChange={(v) => onFilterChange?.(f.id, v)} />
      ))}
      {anyActive && onClearAll && (
        <button
          type="button"
          className="orb-button orb-button--ghost orb-button--sm"
          onClick={onClearAll}
        >
          Clear filters
        </button>
      )}
      {actions && <div className="orb-filterbar__actions">{actions}</div>}
      {resultCount != null && (
        <span className="orb-sr-only" aria-live="polite">
          {anyActive ? `${resultCount} matching issue${resultCount === 1 ? "" : "s"}` : ""}
        </span>
      )}
    </div>
  );
}
