import { CalendarDays, ChevronLeft, ChevronRight } from "@orbit/icons";
import { Popover as RP } from "radix-ui";
import { forwardRef, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { usePortalContainer } from "../../theme/ThemeProvider";
import { cn } from "../../utils/cn";
import { useControllableState } from "../../utils/use-controllable-state";
import { useFieldControl } from "./Form";

/** Dates are exchanged as ISO calendar strings (`YYYY-MM-DD`) to avoid timezone drift. */
export type ISODate = string;

export function toISODate(d: Date): ISODate {
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function fromISODate(s: ISODate): Date {
  const [y = 1970, m = 1, d = 1] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function addMonths(d: Date, n: number) {
  const r = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const last = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate();
  r.setDate(Math.min(d.getDate(), last));
  return r;
}

/* ================================================================ Calendar */

export interface CalendarProps {
  value?: ISODate | null;
  defaultValue?: ISODate | null;
  onValueChange?: (value: ISODate) => void;
  min?: ISODate;
  max?: ISODate;
  /** 0 = Sunday, 1 = Monday. Defaults to 1. */
  weekStartsOn?: 0 | 1;
  locale?: string;
  className?: string;
  /** Focus the selected/today cell on mount (used inside popovers). */
  initialFocus?: boolean;
}

/** Month grid implementing the ARIA date-grid keyboard model. */
export function Calendar({
  value,
  defaultValue = null,
  onValueChange,
  min,
  max,
  weekStartsOn = 1,
  locale,
  className,
  initialFocus,
}: CalendarProps) {
  const [selected, setSelected] = useControllableState<ISODate | null>(
    value,
    defaultValue,
    (v) => v && onValueChange?.(v),
  );
  const today = toISODate(new Date());
  const [focused, setFocused] = useState<Date>(() => fromISODate(selected ?? today));
  const [month, setMonth] = useState(() => new Date(focused.getFullYear(), focused.getMonth(), 1));
  const gridRef = useRef<HTMLTableElement>(null);
  const shouldFocus = useRef(Boolean(initialFocus));
  const titleId = useId();

  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(
    month,
  );
  const dayLabel = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const weekdays = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { weekday: "short" });
    const narrow = new Intl.DateTimeFormat(locale, { weekday: "long" });
    // 2024-01-07 is a Sunday.
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(2024, 0, 7 + ((i + weekStartsOn) % 7));
      return { short: fmt.format(d).slice(0, 2), long: narrow.format(d) };
    });
  }, [locale, weekStartsOn]);

  const weeks = useMemo(() => {
    const first = new Date(month);
    const offset = (first.getDay() - weekStartsOn + 7) % 7;
    const start = addDays(first, -offset);
    return Array.from({ length: 6 }, (_, w) =>
      Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)),
    );
  }, [month, weekStartsOn]);

  const outOfRange = (iso: ISODate) => Boolean((min && iso < min) || (max && iso > max));

  const focusDate = (d: Date) => {
    setFocused(d);
    if (d.getMonth() !== month.getMonth() || d.getFullYear() !== month.getFullYear()) {
      setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    }
    shouldFocus.current = true;
  };

  useEffect(() => {
    if (!shouldFocus.current) return;
    shouldFocus.current = false;
    gridRef.current
      ?.querySelector<HTMLButtonElement>(`[data-date="${toISODate(focused)}"]`)
      ?.focus();
  }, [focused, month]);

  const onKeyDown = (e: KeyboardEvent) => {
    const map: Record<string, () => Date> = {
      ArrowLeft: () => addDays(focused, -1),
      ArrowRight: () => addDays(focused, 1),
      ArrowUp: () => addDays(focused, -7),
      ArrowDown: () => addDays(focused, 7),
      PageUp: () => addMonths(focused, e.shiftKey ? -12 : -1),
      PageDown: () => addMonths(focused, e.shiftKey ? 12 : 1),
      Home: () => addDays(focused, -((focused.getDay() - weekStartsOn + 7) % 7)),
      End: () => addDays(focused, 6 - ((focused.getDay() - weekStartsOn + 7) % 7)),
    };
    const fn = map[e.key];
    if (fn) {
      e.preventDefault();
      focusDate(fn());
    }
  };

  const focusedIso = toISODate(focused);
  return (
    <div className={cn("orb-calendar", className)}>
      <div className="orb-calendar__header">
        <button
          type="button"
          className="orb-button orb-button--ghost orb-button--sm orb-button--icon"
          aria-label="Previous month"
          onClick={() => setMonth(addMonths(month, -1))}
        >
          <ChevronLeft size={16} aria-hidden />
        </button>
        <div id={titleId} className="orb-calendar__title" aria-live="polite">
          {monthLabel}
        </div>
        <button
          type="button"
          className="orb-button orb-button--ghost orb-button--sm orb-button--icon"
          aria-label="Next month"
          onClick={() => setMonth(addMonths(month, 1))}
        >
          <ChevronRight size={16} aria-hidden />
        </button>
      </div>
      <table
        ref={gridRef}
        role="grid"
        aria-labelledby={titleId}
        className="orb-calendar__grid"
        onKeyDown={onKeyDown}
      >
        <thead>
          <tr>
            {weekdays.map((w) => (
              <th key={w.long} scope="col" abbr={w.long}>
                {w.short}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, i) => (
            <tr key={i}>
              {week.map((d) => {
                const iso = toISODate(d);
                const outside = d.getMonth() !== month.getMonth();
                const disabled = outOfRange(iso);
                const isSelected = iso === selected;
                // Roving tabindex: the focused day if visible, else the 1st of the month.
                const tabbable =
                  iso === focusedIso && !outside
                    ? true
                    : focused.getMonth() !== month.getMonth() && d.getDate() === 1 && !outside;
                return (
                  <td key={iso} role="gridcell" aria-selected={isSelected || undefined}>
                    <button
                      type="button"
                      data-date={iso}
                      tabIndex={tabbable ? 0 : -1}
                      disabled={disabled}
                      aria-label={dayLabel.format(d)}
                      aria-current={iso === today ? "date" : undefined}
                      className={cn(
                        "orb-calendar__day",
                        outside && "orb-calendar__day--outside",
                        isSelected && "orb-calendar__day--selected",
                        iso === today && "orb-calendar__day--today",
                      )}
                      onClick={() => {
                        setFocused(d);
                        setSelected(iso);
                      }}
                    >
                      {d.getDate()}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ============================================================== DatePicker */

export interface DatePickerProps extends Omit<CalendarProps, "initialFocus" | "className"> {
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  clearable?: boolean;
  /** Called with `null` when cleared. */
  onClear?: () => void;
  size?: "sm" | "md" | "lg";
  className?: string;
  id?: string;
  "aria-label"?: string;
  appearance?: "default" | "ghost";
  /** Intl date format options for the trigger label. */
  format?: Intl.DateTimeFormatOptions;
}

export const DatePicker = forwardRef<HTMLButtonElement, DatePickerProps>(function DatePicker(
  {
    value,
    defaultValue = null,
    onValueChange,
    placeholder = "Pick a date",
    disabled,
    invalid,
    clearable,
    onClear,
    size = "md",
    className,
    id,
    appearance = "default",
    format = { month: "short", day: "numeric", year: "numeric" },
    "aria-label": ariaLabel,
    ...calendarProps
  },
  ref,
) {
  const container = usePortalContainer();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useControllableState<ISODate | null>(value, defaultValue);
  const a11y = useFieldControl({ id, "aria-invalid": invalid || undefined, disabled });
  const label = selected
    ? new Intl.DateTimeFormat(calendarProps.locale, format).format(fromISODate(selected))
    : placeholder;
  return (
    <RP.Root open={open} onOpenChange={setOpen}>
      <div className={cn("orb-datepicker", className)}>
        <RP.Trigger asChild disabled={a11y.disabled}>
          <button
            ref={ref}
            type="button"
            id={a11y.id}
            aria-label={ariaLabel ? `${ariaLabel}: ${selected ? label : "not set"}` : undefined}
            aria-describedby={a11y["aria-describedby"]}
            aria-haspopup="dialog"
            className={cn(
              "orb-select",
              `orb-input--${size}`,
              appearance === "ghost" && "orb-select--ghost",
              a11y["aria-invalid"] && "orb-input--invalid",
            )}
          >
            <CalendarDays size={15} aria-hidden className="orb-select__lead" />
            <span className={cn("orb-select__value", !selected && "orb-select__placeholder")}>
              {label}
            </span>
          </button>
        </RP.Trigger>
        {clearable && selected && !a11y.disabled && (
          <button
            type="button"
            className="orb-datepicker__clear"
            aria-label="Clear date"
            onClick={() => {
              setSelected(null);
              onClear?.();
            }}
          >
            ×
          </button>
        )}
      </div>
      <RP.Portal container={container}>
        <RP.Content
          className="orb-popover orb-popover--glass orb-pad-sm"
          sideOffset={6}
          align="start"
          collisionPadding={8}
          aria-label="Choose date"
        >
          <Calendar
            {...calendarProps}
            value={selected}
            initialFocus
            onValueChange={(v) => {
              setSelected(v);
              onValueChange?.(v);
              setOpen(false);
            }}
          />
        </RP.Content>
      </RP.Portal>
    </RP.Root>
  );
});
