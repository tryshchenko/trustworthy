import { useState } from "react";
import { addDays, daysBetween, presets, periodLabel, type CompareMode, type DashboardState, type PeriodId } from "../lib/period";
import { Button, Icon, Popover } from "../ui";

interface Props {
  state: DashboardState;
  today: string;
  onChange: (next: { period: PeriodId; from?: string; to?: string }) => void;
}

/** Date range: presets as a list, a custom range below a rule, and stepping arrows. */
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
    <div className="toolbar__group">
      <Popover
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (o) {
            setFrom(state.from);
            setTo(state.to);
          }
        }}
        trigger={(p) => (
          <Button {...p} aria-label={`Date range: ${periodLabel(state)}`} style={{ minWidth: 170, justifyContent: "space-between" }}>
            {periodLabel(state)}
            <Icon name="chevron-down" />
          </Button>
        )}
      >
        <ul className="menu" role="listbox" aria-label="Date range presets">
          {presets.map((p) => (
            <li key={p.id} role="option" aria-selected={state.period === p.id}>
              <button
                type="button"
                className="menu__item"
                aria-selected={state.period === p.id}
                onClick={() => {
                  onChange({ period: p.id });
                  setOpen(false);
                }}
              >
                <span className="menu__check">{state.period === p.id && <Icon name="check" />}</span>
                {p.label}
              </button>
            </li>
          ))}
        </ul>
        <form
          className="menu__form"
          onSubmit={(e) => {
            e.preventDefault();
            if (from && to && from <= to) {
              onChange({ period: "custom", from, to });
              setOpen(false);
            }
          }}
        >
          <span className="label">Custom range</span>
          <div className="row-2">
            <input className="input" type="date" aria-label="From" value={from} max={to || today} onChange={(e) => setFrom(e.target.value)} />
            <input className="input" type="date" aria-label="To" value={to} min={from} max={today} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button type="submit" variant="primary" size="sm" disabled={!from || !to || from > to}>
            Apply range
          </Button>
        </form>
      </Popover>
      <Button icon aria-label="Previous period" title="Previous period" onClick={() => shift(-1)}>
        <Icon name="chevron-left" />
      </Button>
      <Button icon aria-label="Next period" title="Next period" onClick={() => shift(1)} disabled={state.to >= today}>
        <Icon name="chevron-right" />
      </Button>
    </div>
  );
}

export function CompareSelect({ value, onChange }: { value: CompareMode; onChange: (v: CompareMode) => void }) {
  return (
    <select className="select select--compact" aria-label="Compare to" value={value} onChange={(e) => onChange(e.target.value as CompareMode)}>
      <option value="previous">vs previous period</option>
      <option value="year">vs last year</option>
      <option value="none">No comparison</option>
    </select>
  );
}
