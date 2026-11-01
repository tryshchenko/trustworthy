import { ArrowDown, ArrowUp, ChevronsUpDown } from "@orbit/icons";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useMemo, useRef, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "../../utils/cn";
import { useControllableState } from "../../utils/use-controllable-state";

export interface DataGridColumn<T> {
  id: string;
  header: ReactNode;
  /** Plain-text header used for sort announcements when `header` is not a string. */
  headerLabel?: string;
  cell: (row: T) => ReactNode;
  /** Enables sorting on this column. */
  sortValue?: (row: T) => string | number | null | undefined;
  width?: number | string;
  align?: "start" | "center" | "end";
  /** Row header cell (`<th scope="row">`) for screen readers. Use on the name/title column. */
  isRowHeader?: boolean;
}

export interface DataGridSort {
  columnId: string;
  direction: "asc" | "desc";
}

export interface DataGridProps<T> {
  columns: DataGridColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  /** Accessible name of the table. */
  label: string;
  sort?: DataGridSort | null;
  defaultSort?: DataGridSort | null;
  onSortChange?: (sort: DataGridSort | null) => void;
  /** Make rows activatable by click / Enter. */
  onRowActivate?: (row: T) => void;
  selectedRowId?: string | null;
  /** Max height of the scrolling body. Rows are virtualised beyond `virtualizeAfter`. */
  height?: number | string;
  rowHeight?: number;
  virtualizeAfter?: number;
  empty?: ReactNode;
  className?: string;
  /** Render a caption visible to all users. */
  caption?: ReactNode;
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

/**
 * Sortable data table with sticky header. Uses row virtualisation for large
 * datasets (thousands of rows) while keeping native `<table>` semantics.
 */
export function DataGrid<T>({
  columns,
  rows,
  getRowId,
  label,
  sort: sortProp,
  defaultSort = null,
  onSortChange,
  onRowActivate,
  selectedRowId,
  height = 480,
  rowHeight = 44,
  virtualizeAfter = 80,
  empty = "No rows",
  className,
  caption,
}: DataGridProps<T>) {
  const [sort, setSort] = useControllableState<DataGridSort | null>(
    sortProp,
    defaultSort,
    onSortChange,
  );
  const scrollRef = useRef<HTMLDivElement>(null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.id === sort.columnId);
    if (!col?.sortValue) return rows;
    const dir = sort.direction === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      if (av == null) return 1;
      if (bv == null) return -1;
      return (
        (typeof av === "number" && typeof bv === "number"
          ? av - bv
          : collator.compare(String(av), String(bv))) * dir
      );
    });
  }, [rows, sort, columns]);

  const virtual = sorted.length > virtualizeAfter;
  const virtualizer = useVirtualizer({
    count: sorted.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 10,
    enabled: virtual,
  });
  const items = virtual ? virtualizer.getVirtualItems() : null;
  const visible = items
    ? items.map((v) => ({ row: sorted[v.index]!, index: v.index }))
    : sorted.map((row, index) => ({ row, index }));
  const padTop = items && items.length ? items[0]!.start : 0;
  const padBottom =
    items && items.length ? virtualizer.getTotalSize() - items[items.length - 1]!.end : 0;

  const toggleSort = (col: DataGridColumn<T>) => {
    if (!col.sortValue) return;
    if (!sort || sort.columnId !== col.id) setSort({ columnId: col.id, direction: "asc" });
    else if (sort.direction === "asc") setSort({ columnId: col.id, direction: "desc" });
    else setSort(null);
  };

  const onRowKey = (e: KeyboardEvent<HTMLTableRowElement>, row: T) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onRowActivate?.(row);
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const sib = (
        e.key === "ArrowDown"
          ? e.currentTarget.nextElementSibling
          : e.currentTarget.previousElementSibling
      ) as HTMLElement | null;
      if (sib?.tabIndex === 0) sib.focus();
    }
  };

  const sortLabel = sort ? columns.find((c) => c.id === sort.columnId) : undefined;
  return (
    <div className={cn("orb-grid", className)}>
      <div ref={scrollRef} className="orb-grid__scroll" style={{ maxHeight: height }}>
        <table className="orb-grid__table" aria-label={label} aria-rowcount={sorted.length + 1}>
          {caption && <caption className="orb-grid__caption">{caption}</caption>}
          <thead>
            <tr aria-rowindex={1}>
              {columns.map((col) => {
                const dir = sort?.columnId === col.id ? sort.direction : undefined;
                return (
                  <th
                    key={col.id}
                    scope="col"
                    style={{
                      width: col.width,
                      textAlign:
                        col.align === "end"
                          ? "right"
                          : col.align === "center"
                            ? "center"
                            : undefined,
                    }}
                    aria-sort={
                      dir === "asc"
                        ? "ascending"
                        : dir === "desc"
                          ? "descending"
                          : col.sortValue
                            ? "none"
                            : undefined
                    }
                  >
                    {col.sortValue ? (
                      <button
                        type="button"
                        className="orb-grid__sort"
                        onClick={() => toggleSort(col)}
                      >
                        {col.header}
                        {dir === "asc" ? (
                          <ArrowUp size={13} aria-hidden />
                        ) : dir === "desc" ? (
                          <ArrowDown size={13} aria-hidden />
                        ) : (
                          <ChevronsUpDown size={13} aria-hidden className="orb-grid__sort-idle" />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {padTop > 0 && (
              <tr aria-hidden style={{ height: padTop }}>
                <td colSpan={columns.length} />
              </tr>
            )}
            {visible.map(({ row, index }) => {
              const id = getRowId(row);
              return (
                <tr
                  key={id}
                  aria-rowindex={index + 2}
                  aria-current={selectedRowId === id ? "true" : undefined}
                  tabIndex={onRowActivate ? 0 : undefined}
                  className={cn(
                    "orb-grid__row",
                    onRowActivate && "orb-grid__row--interactive",
                    selectedRowId === id && "orb-grid__row--selected",
                  )}
                  style={{ height: rowHeight } as CSSProperties}
                  onClick={onRowActivate ? () => onRowActivate(row) : undefined}
                  onKeyDown={onRowActivate ? (e) => onRowKey(e, row) : undefined}
                >
                  {columns.map((col) => {
                    const Cell = col.isRowHeader ? "th" : "td";
                    return (
                      <Cell
                        key={col.id}
                        scope={col.isRowHeader ? "row" : undefined}
                        style={{
                          textAlign:
                            col.align === "end"
                              ? "right"
                              : col.align === "center"
                                ? "center"
                                : undefined,
                        }}
                      >
                        {col.cell(row)}
                      </Cell>
                    );
                  })}
                </tr>
              );
            })}
            {padBottom > 0 && (
              <tr aria-hidden style={{ height: padBottom }}>
                <td colSpan={columns.length} />
              </tr>
            )}
          </tbody>
        </table>
        {sorted.length === 0 && <div className="orb-grid__empty">{empty}</div>}
      </div>
      <span className="orb-sr-only" aria-live="polite">
        {sort && sortLabel
          ? `Sorted by ${sortLabel.headerLabel ?? (typeof sortLabel.header === "string" ? sortLabel.header : sortLabel.id)}, ${sort.direction === "asc" ? "ascending" : "descending"}`
          : ""}
      </span>
    </div>
  );
}
