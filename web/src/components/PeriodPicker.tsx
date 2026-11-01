import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight } from "@orbit/icons";
import { Button, DatePicker, IconButton, Popover, PopoverContent, PopoverTrigger, Select } from "@orbit/ui";
import { useState } from "react";
import { addDays, daysBetween, presets, periodLabel, type CompareMode, type DashboardState, type PeriodId } from "../lib/period";

interface Props {
  state: DashboardState;
  today: string;
  onChange: (next: { period: PeriodId; from?: string; to?: string }) => void;
}

/** Date-range control: presets as rows, custom range tucked behind a hairline. */
export function PeriodPicker({ state, today, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(state.from);
  const [to, setTo] = useState(state.to);

  const shift = (dir: -1 | 1) => {
    const len = daysBetween(state.from, state.to);
    let f = addDays(state.from, dir * len);
    let t = addDays(state.to, dir * len);
    if (t > today) {
      t = today;
      f = addDays(today, -(len - 1));
    }
    onChange({ period: "custom", from: f, to: t });
  };

  return (
    <div className="flex items-center gap-1">
      <Popover
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (o) {
            setFrom(state.from);
            setTo(state.to);
          }
        }}
      >
        <PopoverTrigger asChild>
          <Button leadingIcon={<CalendarDays size={16} />} trailingIcon={<ChevronDown size={14} />} aria-label={`Date range: ${periodLabel(state)}`}>
            <span className="max-w-[16ch] truncate sm:max-w-none">{periodLabel(state)}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" padding="none" className="w-[280px]">
          <ul role="listbox" aria-label="Date range presets" className="m-0 list-none p-1.5">
            {presets.map((p) => {
              const selected = state.period === p.id;
              return (
                <li key={p.id} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    className="flex h-9 w-full items-center gap-2 rounded-md px-2.5 text-left text-sm hover:bg-[var(--orb-color-surface-hover)] focus-visible:bg-[var(--orb-color-surface-hover)] focus-visible:outline-none"
                    onClick={() => {
                      onChange({ period: p.id });
                      setOpen(false);
                    }}
                  >
                    <span className="grid w-4 place-items-center text-accent-fg">{selected && <Check size={16} strokeWidth={3} />}</span>
                    <span className={selected ? "font-semibold" : ""}>{p.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <form
            className="flex flex-col gap-2 border-t border-line p-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (from && to && from <= to) {
                onChange({ period: "custom", from, to });
                setOpen(false);
              }
            }}
          >
            <span className="orb-type-overline text-fg-subtle">Custom range</span>
            <div className="grid grid-cols-2 gap-2">
              <DatePicker aria-label="From" value={from} max={today} onValueChange={(v) => setFrom(v)} size="sm" format={{ month: "short", day: "numeric", year: "2-digit" }} />
              <DatePicker aria-label="To" value={to} min={from} max={today} onValueChange={(v) => setTo(v)} size="sm" format={{ month: "short", day: "numeric", year: "2-digit" }} />
            </div>
            <Button type="submit" size="sm" variant="primary" disabled={!from || !to || from > to}>
              Apply range
            </Button>
          </form>
        </PopoverContent>
      </Popover>
      <IconButton label="Previous period" icon={<ChevronLeft size={16} />} variant="ghost" onClick={() => shift(-1)} />
      <IconButton label="Next period" icon={<ChevronRight size={16} />} variant="ghost" onClick={() => shift(1)} disabled={state.to >= today} />
    </div>
  );
}

export function CompareSelect({ value, onChange }: { value: CompareMode; onChange: (v: CompareMode) => void }) {
  return (
    <div className="w-[186px] flex-none">
    <Select
      aria-label="Compare to"
      value={value}
      onValueChange={(v) => onChange(v as CompareMode)}
      options={[
        { value: "previous", label: "vs previous period" },
        { value: "year", label: "vs last year" },
        { value: "none", label: "No comparison" },
      ]}
    />
    </div>
  );
}
