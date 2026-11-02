import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { api, ApiError, type Site, type SiteInput } from "../lib/api";
import { addDays, todayIn } from "../lib/period";
import { keys } from "../lib/queries";
import { navigate } from "../lib/router";
import { Button, ButtonLink, Dialog, Field, Icon, toast } from "../ui";

export const retentionOptions = [
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "180", label: "6 months" },
  { value: "365", label: "1 year" },
  { value: "730", label: "2 years" },
  { value: "1825", label: "5 years" },
  { value: "0", label: "Keep forever" },
];

/** Time zones grouped by region for a native <select>. */
function useTimeZones(): [string, string[]][] {
  return useMemo(() => {
    let zones: string[] = [];
    try {
      zones = (Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf("timeZone");
    } catch {
      zones = [];
    }
    const groups = new Map<string, string[]>([["Other", ["UTC"]]]);
    for (const z of zones) {
      if (z === "UTC") continue;
      const region = z.includes("/") ? z.split("/")[0]! : "Other";
      groups.set(region, [...(groups.get(region) ?? []), z]);
    }
    return [...groups.entries()].sort(([a], [b]) => (a === "Other" ? 1 : b === "Other" ? -1 : a.localeCompare(b)));
  }, []);
}

export function SiteFields({ value, onChange, errors }: { value: SiteInput; onChange: (v: SiteInput) => void; errors?: Partial<Record<keyof SiteInput, string>> }) {
  const zones = useTimeZones();
  const known = zones.some(([, zs]) => zs.includes(value.timezone));
  return (
    <div className="form-grid">
      <Field label="Domain" hint="Without https:// — subdomains are counted too." error={errors?.domain}>
        <input
          className="input"
          value={value.domain}
          onChange={(e) => onChange({ ...value, domain: e.target.value })}
          placeholder="example.com"
          spellCheck={false}
          autoCapitalize="off"
          autoFocus={!value.domain}
        />
      </Field>
      <Field label="Display name" hint="Shown in the dashboard only.">
        <input className="input" value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} placeholder={value.domain || "My website"} />
      </Field>
      <Field label="Reporting time zone" hint="Days and hours in reports follow this zone." error={errors?.timezone}>
        <select className="select" value={value.timezone} onChange={(e) => onChange({ ...value, timezone: e.target.value })}>
          {!known && <option value={value.timezone}>{value.timezone.replace(/_/g, " ")}</option>}
          {zones.map(([region, zs]) => (
            <optgroup key={region} label={region}>
              {zs.map((z) => (
                <option key={z} value={z}>
                  {z.replace(/_/g, " ")}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </Field>
    </div>
  );
}

export function SiteSettingsPage({ site }: { site: Site }) {
  const qc = useQueryClient();
  const initial = { domain: site.domain, name: site.name, timezone: site.timezone };
  const [form, setForm] = useState<SiteInput>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = todayIn(site.timezone);
  const [exportFrom, setExportFrom] = useState(addDays(today, -29));
  const [exportTo, setExportTo] = useState(today);
  const [confirm, setConfirm] = useState<"reset" | "delete" | null>(null);
  const [typed, setTyped] = useState("");

  const dirty = form.domain !== site.domain || form.name !== site.name || form.timezone !== site.timezone;

  const save = async (patch: Partial<SiteInput> = {}) => {
    setBusy(true);
    setError(null);
    try {
      await api.put<Site>(`/api/sites/${site.id}`, { ...form, retentionDays: site.retentionDays, ...patch });
      await qc.invalidateQueries({ queryKey: keys.sites });
      await qc.invalidateQueries({ predicate: (q) => q.queryKey[1] === site.id });
      toast("Settings saved");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't save settings");
    } finally {
      setBusy(false);
    }
  };

  const destroy = async () => {
    try {
      if (confirm === "delete") {
        await api.del(`/api/sites/${site.id}`);
        toast(`${site.domain} deleted`);
        await qc.invalidateQueries({ queryKey: keys.sites });
        navigate("/", { replace: true });
      } else {
        await api.post(`/api/sites/${site.id}/reset`);
        toast("Statistics reset");
        await qc.invalidateQueries();
      }
    } catch (e) {
      toast("Something went wrong", { detail: (e as Error).message, tone: "danger" });
    }
    setConfirm(null);
    setTyped("");
  };

  const close = () => {
    setConfirm(null);
    setTyped("");
  };

  return (
    <>
      <section className="split">
        <header>
          <h2 className="h3">General</h2>
          <p>The domain decides which pages may send data. Other hosts are rejected.</p>
        </header>
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <SiteFields value={form} onChange={setForm} errors={error ? { domain: error } : undefined} />
          <div className="form-actions">
            {dirty && (
              <Button variant="quiet" onClick={() => setForm(initial)}>
                Discard
              </Button>
            )}
            <Button type="submit" variant="primary" busy={busy} disabled={!dirty}>
              Save changes
            </Button>
          </div>
        </form>
      </section>

      <section className="split">
        <header>
          <h2 className="h3">Data retention</h2>
          <p>Older statistics are deleted automatically every few hours.</p>
        </header>
        <div className="stack" style={{ gap: "1rem", maxWidth: "26rem" }}>
          <Field label="Keep statistics for">
            <select className="select" value={String(site.retentionDays)} onChange={(e) => void save({ retentionDays: Number(e.target.value) })}>
              {retentionOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <p className="small muted">Only anonymous hourly totals are stored, so a long retention holds no personal data. Shorter periods keep the database small.</p>
        </div>
      </section>

      <section className="split">
        <header>
          <h2 className="h3">Export</h2>
          <p>Daily aggregates for every dimension, as CSV.</p>
        </header>
        <div className="row-flex" style={{ alignItems: "flex-end", gap: "1rem" }}>
          <Field label="From">
            <input className="input" type="date" value={exportFrom} max={exportTo} onChange={(e) => setExportFrom(e.target.value)} />
          </Field>
          <Field label="To">
            <input className="input" type="date" value={exportTo} min={exportFrom} max={today} onChange={(e) => setExportTo(e.target.value)} />
          </Field>
          <ButtonLink href={`/api/sites/${site.id}/export?from=${exportFrom}&to=${exportTo}`} download style={{ minHeight: 46 }}>
            <Icon name="download" /> Download CSV
          </ButtonLink>
        </div>
      </section>

      <section className="split split--danger">
        <header>
          <h2 className="h3">Danger zone</h2>
          <p>These can't be undone.</p>
        </header>
        <div className="stack">
          <div className="row-flex" style={{ justifyContent: "space-between", paddingBottom: "1.25rem", borderBottom: "1px solid var(--line-soft)" }}>
            <div>
              <p style={{ fontWeight: 500 }}>Reset statistics</p>
              <p className="small muted">Delete all collected data for {site.domain}. Settings and goals are kept.</p>
            </div>
            <Button onClick={() => setConfirm("reset")}>Reset statistics</Button>
          </div>
          <div className="row-flex" style={{ justifyContent: "space-between", paddingTop: "1.25rem" }}>
            <div>
              <p style={{ fontWeight: 500 }}>Delete website</p>
              <p className="small muted">Permanently remove this site, its goals and all its statistics.</p>
            </div>
            <Button variant="danger" onClick={() => setConfirm("delete")}>
              Delete website
            </Button>
          </div>
        </div>
      </section>

      <Dialog
        open={!!confirm}
        onClose={close}
        onSubmit={() => typed.trim().toLowerCase() === site.domain && void destroy()}
        title={confirm === "delete" ? `Delete ${site.domain}?` : "Reset all statistics?"}
        description="This can't be undone. Export your data first if you might need it."
        footer={
          <>
            <Button variant="quiet" onClick={close}>
              Cancel
            </Button>
            <Button variant="danger" type="submit" disabled={typed.trim().toLowerCase() !== site.domain}>
              {confirm === "delete" ? "Delete website" : "Reset statistics"}
            </Button>
          </>
        }
      >
        <Field
          label={
            <>
              Type <span style={{ color: "var(--ink)", textTransform: "none", letterSpacing: 0 }}>{site.domain}</span> to confirm
            </>
          }
        >
          <input className="input" value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus spellCheck={false} autoCapitalize="off" />
        </Field>
      </Dialog>
    </>
  );
}
