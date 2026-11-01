import { FileText, Info, Plus, Target, Trash2, Zap } from "@orbit/icons";
import {
  AeroButton,
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Field,
  IconButton,
  Input,
  Panel,
  Radio,
  RadioGroup,
  Skeleton,
  Tooltip,
  toast,
} from "@orbit/ui";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";
import { BreakdownCard } from "../components/Breakdown";
import { Delta } from "../components/MetricTiles";
import { api, ApiError, type GoalStat, type Site } from "../lib/api";
import { compact, number, percent } from "../lib/format";
import { compareLabel, readState } from "../lib/period";
import { keys, useBreakdown, useGoalStats } from "../lib/queries";
import { Link } from "../lib/router";
import { SiteHeader, Toolbar, useDashboardState } from "./OverviewPage";

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
      toast({ title: `Deleted “${g.name}”`, tone: "success" });
      await qc.invalidateQueries({ queryKey: ["goal-stats", site.id] });
      await qc.invalidateQueries({ queryKey: keys.goals(site.id) });
    } catch (e) {
      toast({ title: "Couldn't delete goal", description: (e as Error).message, tone: "danger" });
    }
    setDeleting(null);
  };

  return (
    <div className="tw-page">
      <SiteHeader site={site} title="Goals & events" actions={<AeroButton leadingIcon={<Plus size={16} />} onClick={() => setCreating({ kind: "event", match: "" })}>New goal</AeroButton>} />
      <Toolbar dash={dash} />

      <Panel
        title="Conversion goals"
        description={stats.data ? `${number(stats.data.visits)} visits in this period` : undefined}
        bodyClassName="!p-0"
      >
        <div className={stats.isPlaceholderData ? "tw-stale" : "tw-fresh"}>
          {stats.isPending ? (
            <div className="flex flex-col gap-3 p-4">
              <Skeleton height={40} />
              <Skeleton height={40} />
            </div>
          ) : goals.length === 0 ? (
            <EmptyState
              icon={<Target size={28} />}
              title="Measure what matters"
              description="A goal counts a custom event (like “Signup”) or visits to a page (like /thank-you). You'll see completions and conversion rate for any date range."
              actions={
                <AeroButton leadingIcon={<Plus size={16} />} onClick={() => setCreating({ kind: "event", match: "" })}>
                  Create your first goal
                </AeroButton>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="tw-table">
                <thead>
                  <tr>
                    <th scope="col" className="!pl-4">
                      Goal
                    </th>
                    <th scope="col" className="num">
                      Completions
                    </th>
                    <th scope="col" className="num">
                      <Tooltip content={rateHelp}>
                        <span tabIndex={0} className="inline-flex cursor-help items-center gap-1">
                          Conversion rate <Info size={12} aria-hidden />
                        </span>
                      </Tooltip>
                    </th>
                    {state.compare !== "none" && <th scope="col">Change</th>}
                    <th scope="col">
                      <span className="orb-sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {goals.map((g) => (
                    <tr key={g.id}>
                      <th scope="row" className="!pl-4 font-normal">
                        <span className="flex items-center gap-3">
                          <span className="tw-glyph" style={{ width: 28, height: 28 }} aria-hidden>
                            {g.kind === "event" ? <Zap size={14} /> : <FileText size={14} />}
                          </span>
                          <span className="min-w-0">
                            <span className="block font-medium">{g.name}</span>
                            <span className="block text-xs text-fg-muted">
                              {g.kind === "event" ? "Event" : "Page visit"} · <span className="tw-inline-code">{g.match}</span>
                            </span>
                          </span>
                        </span>
                      </th>
                      <td className="num align-middle text-base font-semibold">{compact(g.completions)}</td>
                      <td className="num align-middle">
                        <span className="inline-flex items-center gap-2">
                          <span className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--orb-color-accent-soft)] max-sm:hidden" aria-hidden>
                            <span className="block h-full rounded-full" style={{ width: `${Math.min(100, g.rate)}%`, background: "var(--tw-series-visits)" }} />
                          </span>
                          {percent(g.rate, 1)}
                        </span>
                      </td>
                      {state.compare !== "none" && (
                        <td className="align-middle">
                          <span className="inline-flex items-center gap-1.5 text-xs text-fg-subtle">
                            <Delta current={g.completions} previous={g.compareCompletions} label={cmp} />
                          </span>
                        </td>
                      )}
                      <td className="w-10 align-middle">
                        <IconButton label={`Delete goal ${g.name}`} icon={<Trash2 size={15} />} variant="ghost" size="sm" onClick={() => setDeleting(g)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <BreakdownCard
          site={site}
          state={state}
          title="Custom events"
          tabs={[{ dim: "event", label: "Events" }]}
          onFilter={addFilter}
          footer={
            <Link href={`/sites/${site.id}/install#events`} className="text-accent-fg hover:underline">
              How to send events →
            </Link>
          }
        />
        <Panel title="How goals are counted">
          <ul className="m-0 flex list-none flex-col gap-3 p-0 text-sm text-fg-muted">
            <li className="flex gap-3">
              <Zap size={16} className="mt-0.5 flex-none text-accent-fg" aria-hidden />
              <span>
                <b className="text-fg">Event goals</b> count every time your site sends that event name, for example{" "}
                <span className="tw-inline-code">tw("Signup")</span>.
              </span>
            </li>
            <li className="flex gap-3">
              <FileText size={16} className="mt-0.5 flex-none text-accent-fg" aria-hidden />
              <span>
                <b className="text-fg">Page goals</b> count pageviews of matching paths. Use <span className="tw-inline-code">*</span> as a wildcard:{" "}
                <span className="tw-inline-code">/blog/*</span>.
              </span>
            </li>
            <li className="flex gap-3">
              <Info size={16} className="mt-0.5 flex-none text-accent-fg" aria-hidden />
              <span>{rateHelp}</span>
            </li>
          </ul>
        </Panel>
      </div>

      <GoalDialog site={site} initial={creating} onClose={() => setCreating(null)} />

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Delete “{deleting?.name}”?</DialogTitle>
            <DialogDescription>The goal definition is removed. Your underlying event and pageview counts are kept.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => deleting && void remove(deleting)}>
              Delete goal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
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

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post(`/api/sites/${site.id}/goals`, { kind, match, name });
      toast({ title: "Goal created", tone: "success" });
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
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="md">
        <form onSubmit={submit} noValidate>
          <DialogHeader>
            <DialogTitle>New goal</DialogTitle>
            <DialogDescription>Goals turn events or page visits into conversions you can track over time.</DialogDescription>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-4">
            <RadioGroup value={kind} onValueChange={(v) => setKind(v as "event" | "page")} aria-label="Goal type" className="grid gap-2 sm:grid-cols-2">
              <Radio value="event" label="Custom event" description="e.g. Signup, Download" />
              <Radio value="page" label="Page visit" description="e.g. /thank-you, /blog/*" />
            </RadioGroup>
            <Field
              label={kind === "event" ? "Event name" : "Page path"}
              required
              error={error ?? undefined}
              description={kind === "page" ? "Use * as a wildcard. Matching is exact otherwise." : "Must match the name your site sends, including capitalisation."}
            >
              <Input value={match} onChange={(e) => setMatch(e.target.value)} placeholder={kind === "event" ? "Signup" : "/thank-you"} autoFocus spellCheck={false} />
            </Field>
            {sugg.data && sugg.data.rows.length > 0 && (
              <div className="-mt-1 flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-fg-subtle">Seen recently:</span>
                {sugg.data.rows.map((r) => (
                  <Button key={r.value} size="sm" variant="soft" type="button" onClick={() => setMatch(r.value)}>
                    {r.value}
                  </Button>
                ))}
              </div>
            )}
            <Field label="Display name" description="Optional. Defaults to the event name or path.">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={kind === "event" ? "Signed up" : "Reached checkout"} />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" type="button" onClick={onClose}>
              Cancel
            </Button>
            <AeroButton type="submit" loading={busy} disabled={!match.trim()}>
              Create goal
            </AeroButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
