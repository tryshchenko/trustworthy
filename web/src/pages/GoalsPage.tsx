import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { BreakdownCard } from "../components/Breakdown";
import { Delta } from "../components/MetricTiles";
import { api, ApiError, type GoalStat, type Site } from "../lib/api";
import { compact, number, percent } from "../lib/format";
import { compareLabel, readState } from "../lib/period";
import { keys, useBreakdown, useGoalStats } from "../lib/queries";
import { Link } from "../lib/router";
import { Button, Dialog, Empty, Field, Icon, Skeleton, toast } from "../ui";
import { Toolbar, useDashboardState } from "./OverviewPage";

const rateHelp =
  "Completions divided by visits in the same period. Visitors aren't identified, so someone who converts twice counts twice — read it as conversions per 100 visits, not a share of people.";

export function GoalsPage({ site }: { site: Site }) {
  const dash = useDashboardState(site);
  const { state, addFilter } = dash;
  const stats = useGoalStats(site, state);
  const qc = useQueryClient();
  const [creating, setCreating] = useState<{ kind: "event" | "page"; match: string } | null>(null);
  const [deleting, setDeleting] = useState<GoalStat | null>(null);
  const goals = stats.data?.goals ?? [];
  const cmp = compareLabel(state.compare);

  const remove = async (g: GoalStat) => {
    try {
      await api.del(`/api/sites/${site.id}/goals/${g.id}`);
      toast(`Deleted “${g.name}”`);
      await qc.invalidateQueries({ queryKey: ["goal-stats", site.id] });
      await qc.invalidateQueries({ queryKey: keys.goals(site.id) });
    } catch (e) {
      toast("Couldn't delete goal", { detail: (e as Error).message, tone: "danger" });
    }
    setDeleting(null);
  };

  const newGoal = (
    <Button variant="primary" onClick={() => setCreating({ kind: "event", match: "" })}>
      <Icon name="plus" /> New goal
    </Button>
  );

  return (
    <>
      <Toolbar dash={dash} actions={goals.length > 0 ? newGoal : undefined} />

      <section className="block" aria-label="Conversion goals">
        <header className="block__head">
          <h2 className="h3">Conversion goals</h2>
          {stats.data && <p>{number(stats.data.visits)} visits in this period</p>}
        </header>
        <div className={stats.isPlaceholderData ? "is-stale" : "is-fresh"}>
          {stats.isPending ? (
            <div className="stack" style={{ gap: 16 }}>
              <Skeleton height={44} />
              <Skeleton height={44} />
            </div>
          ) : goals.length === 0 ? (
            <Empty title="Measure what matters" action={newGoal}>
              A goal counts a custom event (like “Signup”) or visits to a page (like /thank-you). You'll see completions and a conversion rate for any date
              range.
            </Empty>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Goal</th>
                    <th scope="col" className="r">
                      Completions
                    </th>
                    <th scope="col" className="r" title={rateHelp}>
                      Per 100 visits
                    </th>
                    {state.compare !== "none" && <th scope="col">Change</th>}
                    <th scope="col">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {goals.map((g) => (
                    <tr key={g.id}>
                      <th scope="row">
                        <span style={{ display: "block", fontSize: "1.05rem" }}>{g.name}</span>
                        <span className="label" style={{ marginTop: 4 }}>
                          {g.kind === "event" ? "Event" : "Page"} · <span className="code-inline" style={{ textTransform: "none", letterSpacing: 0 }}>{g.match}</span>
                        </span>
                      </th>
                      <td className="r" style={{ fontSize: "1.6rem", fontStretch: "75%", lineHeight: 1.1 }}>
                        {compact(g.completions)}
                      </td>
                      <td className="r" style={{ fontSize: "1.6rem", fontStretch: "75%", lineHeight: 1.1 }}>
                        {percent(g.rate, 1)}
                      </td>
                      {state.compare !== "none" && (
                        <td>
                          <span className="metric__delta" style={{ marginTop: 6 }}>
                            <Delta current={g.completions} previous={g.compareCompletions} label={cmp} />
                          </span>
                        </td>
                      )}
                      <td style={{ width: 48 }}>
                        <Button variant="quiet" icon aria-label={`Delete goal ${g.name}`} title="Delete goal" onClick={() => setDeleting(g)}>
                          <Icon name="x" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <div className="grid-2 section-gap">
        <BreakdownCard
          site={site}
          state={state}
          title="Custom events"
          tabs={[{ dim: "event", label: "Events" }]}
          onFilter={addFilter}
          footer={
            <Link href={`/sites/${site.id}/install#events`} className="link">
              How to send events →
            </Link>
          }
        />
        <section aria-label="How goals are counted">
          <header className="block__head">
            <h2 className="h3">How goals are counted</h2>
          </header>
          <ul className="ticks">
            <li>
              <b>Event goals</b> count every time your site sends that event name, for example <span className="code-inline">tw("Signup")</span>.
            </li>
            <li>
              <b>Page goals</b> count pageviews of matching paths. Use <span className="code-inline">*</span> as a wildcard: <span className="code-inline">/blog/*</span>.
            </li>
            <li>
              <b>Per 100 visits.</b> {rateHelp}
            </li>
          </ul>
        </section>
      </div>

      <GoalDialog site={site} initial={creating} onClose={() => setCreating(null)} />

      <Dialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title={`Delete “${deleting?.name ?? ""}”?`}
        description="The goal definition is removed. The underlying event and pageview counts are kept."
        footer={
          <>
            <Button variant="quiet" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => deleting && void remove(deleting)}>
              Delete goal
            </Button>
          </>
        }
      />
    </>
  );
}

function GoalDialog({ site, initial, onClose }: { site: Site; initial: { kind: "event" | "page"; match: string } | null; onClose: () => void }) {
  const open = initial !== null;
  const qc = useQueryClient();
  const [kind, setKind] = useState<"event" | "page">("event");
  const [match, setMatch] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastInitial, setLastInitial] = useState(initial);
  if (initial !== lastInitial) {
    setLastInitial(initial);
    if (initial) {
      setKind(initial.kind);
      setMatch(initial.match);
      setName("");
      setError(null);
    }
  }

  // Suggestions from what the site actually sent in the last 30 days.
  const suggestRange = useMemo(() => readState(new URLSearchParams("period=30d&compare=none"), site.timezone), [site.timezone]);
  const sugg = useBreakdown(site, suggestRange, kind === "event" ? "event" : "page", { limit: 6, enabled: open });

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/api/sites/${site.id}/goals`, { kind, match, name });
      toast("Goal created");
      await qc.invalidateQueries({ queryKey: ["goal-stats", site.id] });
      await qc.invalidateQueries({ queryKey: keys.goals(site.id) });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't create goal");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      onSubmit={() => void submit()}
      title="New goal"
      description="Turn an event or a page into a conversion you can follow over time."
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" busy={busy} disabled={!match.trim()}>
            Create goal
          </Button>
        </>
      }
    >
      <fieldset style={{ border: 0, margin: 0, padding: 0, display: "grid", gap: "0.75rem" }}>
        <legend className="label" style={{ marginBottom: "0.75rem" }}>
          Goal type
        </legend>
        <div className="form-grid">
          {(
            [
              ["event", "Custom event", "e.g. Signup, Download"],
              ["page", "Page visit", "e.g. /thank-you, /blog/*"],
            ] as const
          ).map(([v, label, hint]) => (
            <label key={v} className="check">
              <input type="radio" name="goal-kind" checked={kind === v} onChange={() => setKind(v)} style={{ borderRadius: "50%" }} />
              <span>
                <b>{label}</b>
                <small>{hint}</small>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <Field
        label={kind === "event" ? "Event name" : "Page path"}
        required
        error={error}
        hint={kind === "page" ? "Use * as a wildcard. Otherwise matching is exact." : "Must match the name your site sends, including capitalisation."}
      >
        <input className="input" value={match} onChange={(e) => setMatch(e.target.value)} placeholder={kind === "event" ? "Signup" : "/thank-you"} autoFocus spellCheck={false} />
      </Field>
      {sugg.data && sugg.data.rows.length > 0 && (
        <div className="row-flex" style={{ gap: "0.4rem", marginTop: "-0.5rem" }}>
          <span className="label" style={{ marginRight: "0.25rem" }}>
            Seen recently
          </span>
          {sugg.data.rows.map((r) => (
            <Button key={r.value} size="sm" onClick={() => setMatch(r.value)}>
              {r.value}
            </Button>
          ))}
        </div>
      )}
      <Field label="Display name" hint="Optional. Defaults to the event name or path.">
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={kind === "event" ? "Signed up" : "Reached checkout"} />
      </Field>
    </Dialog>
  );
}
