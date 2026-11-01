import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Tone } from "@orbit/tokens";
import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
} from "react";
import { cn } from "../../utils/cn";
import { StatusGlyph, type StatusShape } from "../aero/StatusPill";

/* =========================================================== KanbanColumn */

export interface KanbanColumnProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  title: string;
  count?: number;
  tone?: Tone;
  shape?: StatusShape;
  /** Work-in-progress limit. The header warns when `count` exceeds it. */
  wipLimit?: number;
  /** Header actions (e.g. a "+" button or menu). */
  actions?: ReactNode;
  /** Bottom slot (e.g. quick-create). */
  footer?: ReactNode;
  /** Highlight as an active drop target. */
  isOver?: boolean;
  /** Ref for the scrolling list container (used as the drop zone). */
  listRef?: Ref<HTMLDivElement>;
  /** Rendered when the column has no children. */
  empty?: ReactNode;
}

/** A single board column: status header, count, WIP limit, scrolling card list. */
export const KanbanColumn = forwardRef<HTMLElement, KanbanColumnProps>(function KanbanColumn(
  {
    title,
    count,
    tone = "neutral",
    shape = "dot",
    wipLimit,
    actions,
    footer,
    isOver,
    listRef,
    empty,
    className,
    children,
    ...props
  },
  ref,
) {
  const overLimit = wipLimit != null && count != null && count > wipLimit;
  const headingId = `${props.id ?? title.replace(/\W+/g, "-").toLowerCase()}-heading`;
  return (
    <section
      ref={ref}
      aria-labelledby={headingId}
      className={cn(
        "orb-kanban-col",
        isOver && "orb-kanban-col--over",
        overLimit && "orb-kanban-col--over-limit",
        className,
      )}
      {...props}
    >
      <header className="orb-kanban-col__header">
        <span className={cn("orb-kanban-col__glyph", `orb-tone-${tone}`)}>
          <StatusGlyph shape={shape} size={14} />
        </span>
        <h3 id={headingId} className="orb-kanban-col__title">
          {title}
        </h3>
        {count != null && (
          <span
            className="orb-kanban-col__count"
            aria-label={wipLimit != null ? `${count} of ${wipLimit} limit` : `${count} issues`}
          >
            {count}
            {wipLimit != null && <span className="orb-kanban-col__limit">/{wipLimit}</span>}
          </span>
        )}
        {overLimit && (
          <span className="orb-kanban-col__warning" role="note">
            Over WIP limit
          </span>
        )}
        {actions && <span className="orb-kanban-col__actions">{actions}</span>}
      </header>
      {/* An empty list is not exposed as a list (it would have no listitems). */}
      <div
        ref={listRef}
        className="orb-kanban-col__list"
        role={count === 0 ? undefined : "list"}
        aria-labelledby={count === 0 ? undefined : headingId}
      >
        {children}
        {count === 0 && empty && <div className="orb-kanban-col__empty">{empty}</div>}
      </div>
      {footer && <div className="orb-kanban-col__footer">{footer}</div>}
    </section>
  );
});

/* ============================================================ KanbanBoard */

export interface KanbanColumnDefinition {
  id: string;
  title: string;
  tone?: Tone;
  shape?: StatusShape;
  wipLimit?: number;
}

export interface KanbanMove {
  itemId: string;
  fromColumnId: string;
  toColumnId: string;
  /** Index within the destination column after the move. */
  toIndex: number;
}

export interface KanbanDragHandleProps {
  ref: (el: HTMLElement | null) => void;
  role?: string;
  tabIndex?: number;
  "aria-roledescription"?: string;
  "aria-describedby"?: string;
  "aria-disabled"?: boolean;
  onKeyDown?: React.KeyboardEventHandler;
  onPointerDown?: React.PointerEventHandler;
}

export interface KanbanRenderState {
  /** Spread onto the focusable element that should start a drag (e.g. `<IssueCard {...dragHandleProps} />`). */
  dragHandleProps: KanbanDragHandleProps;
  /** The source item while it's being dragged (rendered as a placeholder). */
  isDragging: boolean;
  /** True when rendering inside the floating drag overlay. */
  isOverlay: boolean;
}

export interface KanbanBoardProps<T> {
  columns: KanbanColumnDefinition[];
  /** Ordered items per column id. */
  itemsByColumn: Record<string, T[]>;
  getItemId: (item: T) => string;
  /** Human-readable name for screen reader drag announcements. */
  getItemLabel: (item: T) => string;
  renderItem: (item: T, state: KanbanRenderState) => ReactNode;
  /** Commit a move. The board keeps an optimistic preview while dragging. */
  onMoveItem: (move: KanbanMove) => void;
  renderColumnEmpty?: (column: KanbanColumnDefinition) => ReactNode;
  renderColumnFooter?: (column: KanbanColumnDefinition) => ReactNode;
  renderColumnActions?: (column: KanbanColumnDefinition) => ReactNode;
  /** Render at most N cards per column, then a "Show more" button. Default 60. */
  pageSize?: number;
  /** Disable drag-and-drop (e.g. while filtered or read-only). */
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

type ColumnsState = Record<string, string[]>;

const toState = <T,>(
  cols: KanbanColumnDefinition[],
  items: Record<string, T[]>,
  getId: (t: T) => string,
) => Object.fromEntries(cols.map((c) => [c.id, (items[c.id] ?? []).map(getId)])) as ColumnsState;

interface SortableItemProps {
  id: string;
  disabled: boolean;
  item: unknown;
  renderItem: (item: never, state: KanbanRenderState) => ReactNode;
}

// Memoised: with a stable `renderItem` only the cards whose item or position changed re-render.
const SortableItem = memo(function SortableItem({
  id,
  disabled,
  item,
  renderItem,
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    disabled,
  });
  const dragHandleProps = {
    ref: setActivatorNodeRef,
    ...attributes,
    ...listeners,
  } as KanbanDragHandleProps;
  return (
    <div
      ref={setNodeRef}
      role="listitem"
      data-kanban-item={id}
      className={cn("orb-kanban__item", isDragging && "orb-kanban__item--placeholder")}
      style={{ transform: CSS.Translate.toString(transform), transition }}
    >
      {renderItem(item as never, { dragHandleProps, isDragging, isOverlay: false })}
    </div>
  );
});

function DroppableColumn({
  column,
  ids,
  children,
  ...rest
}: { column: KanbanColumnDefinition; ids: string[]; children: ReactNode } & Omit<
  KanbanColumnProps,
  "title"
>) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column:${column.id}`,
    data: { columnId: column.id },
  });
  return (
    <SortableContext id={column.id} items={ids} strategy={verticalListSortingStrategy}>
      <KanbanColumn
        id={`kanban-${column.id}`}
        title={column.title}
        tone={column.tone}
        shape={column.shape}
        wipLimit={column.wipLimit}
        isOver={isOver}
        listRef={setNodeRef}
        {...rest}
      >
        {children}
      </KanbanColumn>
    </SortableContext>
  );
}

/**
 * Multi-column drag-and-drop board (dnd-kit). Supports pointer, touch and
 * keyboard dragging (Space to lift, arrows to move, Space to drop, Esc to cancel)
 * with screen reader announcements. Provide a non-drag alternative (e.g. a
 * status selector) in your item UI as well.
 */
export function KanbanBoard<T>({
  columns,
  itemsByColumn,
  getItemId,
  getItemLabel,
  renderItem,
  onMoveItem,
  renderColumnEmpty,
  renderColumnFooter,
  renderColumnActions,
  pageSize = 60,
  disabled = false,
  className,
  "aria-label": ariaLabel = "Board",
}: KanbanBoardProps<T>) {
  const [state, setState] = useState<ColumnsState>(() =>
    toState(columns, itemsByColumn, getItemId),
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [origin, setOrigin] = useState<string | null>(null);
  const [visible, setVisible] = useState<Record<string, number>>({});
  const boardRef = useRef<HTMLDivElement>(null);
  const keyboardDrag = useRef(false);

  // After a keyboard drop the card may have re-mounted in another column; put focus back on it.
  const restoreFocus = (id: string) => {
    if (!keyboardDrag.current) return;
    keyboardDrag.current = false;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const item = boardRef.current?.querySelector(`[data-kanban-item="${CSS_escape(id)}"]`);
        const handle =
          item?.querySelector<HTMLElement>('[aria-roledescription="sortable"]') ??
          (item as HTMLElement | null);
        if (handle && !handle.contains(document.activeElement))
          handle.focus({ preventScroll: false });
      }),
    );
  };

  // Resync from props whenever we're not mid-drag.
  useEffect(() => {
    if (!activeId) setState(toState(columns, itemsByColumn, getItemId));
  }, [columns, itemsByColumn, getItemId, activeId]);

  const byId = useMemo(() => {
    const m = new Map<string, T>();
    for (const list of Object.values(itemsByColumn))
      for (const it of list) m.set(getItemId(it), it);
    return m;
  }, [itemsByColumn, getItemId]);

  const columnOf = useCallback(
    (id: UniqueIdentifier | undefined): string | undefined => {
      if (id == null) return undefined;
      const s = String(id);
      if (s.startsWith("column:")) return s.slice(7);
      return Object.keys(state).find((c) => state[c]?.includes(s));
    },
    [state],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      // Enter is reserved for "open"; Space lifts and drops.
      keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space", "Enter"] },
    }),
  );

  const titleOf = (colId: string | undefined) =>
    columns.find((c) => c.id === colId)?.title ?? "column";
  const labelOf = (id: UniqueIdentifier) => {
    const it = byId.get(String(id));
    return it ? getItemLabel(it) : String(id);
  };
  const positionText = (id: UniqueIdentifier, over: UniqueIdentifier | undefined) => {
    const col = columnOf(over ?? id);
    const idx = col ? (state[col]?.indexOf(String(id)) ?? -1) : -1;
    return `${titleOf(col)}, position ${idx + 1} of ${col ? state[col]?.length : 0}`;
  };

  const announcements: Announcements = {
    onDragStart: ({ active }) =>
      `Picked up ${labelOf(active.id)} in ${positionText(active.id, undefined)}.`,
    onDragOver: ({ active, over }) =>
      over ? `${labelOf(active.id)} moved to ${positionText(active.id, over.id)}.` : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? `Dropped ${labelOf(active.id)} in ${positionText(active.id, over.id)}.`
        : `Dropped ${labelOf(active.id)}.`,
    onDragCancel: ({ active }) =>
      `Move cancelled. ${labelOf(active.id)} returned to ${titleOf(origin ?? undefined)}.`,
  };

  const onDragStart = ({ active, activatorEvent }: DragStartEvent) => {
    keyboardDrag.current = activatorEvent instanceof KeyboardEvent;
    setActiveId(String(active.id));
    setOrigin(columnOf(active.id) ?? null);
  };

  const onDragOver = ({ active, over }: DragOverEvent) => {
    const from = columnOf(active.id);
    const to = columnOf(over?.id);
    if (!from || !to || from === to) return;
    setState((prev) => {
      const fromList = prev[from]!.filter((x) => x !== active.id);
      const toList = [...prev[to]!];
      const overIndex =
        over && !String(over.id).startsWith("column:")
          ? toList.indexOf(String(over.id))
          : toList.length;
      toList.splice(overIndex < 0 ? toList.length : overIndex, 0, String(active.id));
      return { ...prev, [from]: fromList, [to]: toList };
    });
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    const id = String(active.id);
    const to = columnOf(over?.id);
    const from = origin;
    setActiveId(null);
    setOrigin(null);
    restoreFocus(id);
    if (!to || !from || !over) {
      setState(toState(columns, itemsByColumn, getItemId));
      return;
    }
    const list = [...(state[to] ?? [])];
    const oldIndex = list.indexOf(id);
    let newIndex = String(over.id).startsWith("column:")
      ? list.length - 1
      : list.indexOf(String(over.id));
    if (newIndex < 0) newIndex = list.length - 1;
    if (oldIndex !== -1 && oldIndex !== newIndex) {
      list.splice(oldIndex, 1);
      list.splice(newIndex, 0, id);
    }
    const toIndex = list.indexOf(id);
    const originalIndex = (itemsByColumn[from] ?? []).findIndex((it) => getItemId(it) === id);
    if (from === to && originalIndex === toIndex) return;
    onMoveItem({ itemId: id, fromColumnId: from, toColumnId: to, toIndex });
  };

  const activeItem = activeId ? byId.get(activeId) : undefined;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={({ active }) => {
        restoreFocus(String(active.id));
        setActiveId(null);
        setOrigin(null);
        setState(toState(columns, itemsByColumn, getItemId));
      }}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable:
            "Press Enter to open. To move, press Space to pick up, use the arrow keys to move between positions and columns, Space to drop, or Escape to cancel.",
        },
      }}
    >
      <div
        ref={boardRef}
        className={cn("orb-kanban", className)}
        role="region"
        aria-label={ariaLabel}
      >
        {columns.map((column) => {
          const ids = state[column.id] ?? [];
          const limit = visible[column.id] ?? pageSize;
          // Always render the dragged item so dnd-kit can track it.
          const shown = ids.filter((id, i) => i < limit || id === activeId);
          return (
            <DroppableColumn
              key={column.id}
              column={column}
              ids={shown}
              count={ids.length}
              empty={renderColumnEmpty?.(column)}
              footer={renderColumnFooter?.(column)}
              actions={renderColumnActions?.(column)}
            >
              {shown.map((id) => {
                const item = byId.get(id);
                if (!item) return null;
                return (
                  <SortableItem
                    key={id}
                    id={id}
                    disabled={disabled}
                    item={item}
                    renderItem={renderItem as SortableItemProps["renderItem"]}
                  />
                );
              })}
              {ids.length > limit && (
                <button
                  type="button"
                  className="orb-button orb-button--ghost orb-button--sm orb-kanban__more"
                  onClick={() => setVisible((v) => ({ ...v, [column.id]: limit + pageSize }))}
                >
                  Show {Math.min(pageSize, ids.length - limit)} more
                </button>
              )}
            </DroppableColumn>
          );
        })}
      </div>
      <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.2, 0, 0, 1)" }}>
        {activeItem ? (
          // dnd-kit measures the overlay's first child; this wrapper keeps that box
          // untransformed so the card's lifted tilt doesn't skew keyboard collision maths.
          // Visual-only copy: hidden from assistive tech and non-interactive.
          <div className="orb-kanban__overlay" aria-hidden inert>
            {renderItem(activeItem, {
              dragHandleProps: { ref: () => {} },
              isDragging: false,
              isOverlay: true,
            })}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

// Note: `CSS` in this module is dnd-kit's helper, so reach the DOM's CSS.escape via globalThis.
const CSS_escape = (v: string) => globalThis.CSS?.escape?.(v) ?? v.replace(/["\\]/g, "\\$&");
