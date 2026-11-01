import { Download, RotateCcw, Trash2 } from "@orbit/icons";
import {
  AeroButton,
  Button,
  Combobox,
  DatePicker,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  Input,
  Panel,
  Select,
  toast,
  type ListOption,
} from "@orbit/ui";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";
import { api, ApiError, type Site, type SiteInput } from "../lib/api";
import { addDays, todayIn } from "../lib/period";
import { keys } from "../lib/queries";
import { navigate } from "../lib/router";
import { SiteHeader } from "./OverviewPage";

export const siteColors = ["#1A78E6", "#12B8AE", "#7C5CE6", "#E8833A", "#D6457A", "#2F9E5B", "#0EA5C6", "#B5651D"];

export const retentionOptions = [
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "180", label: "6 months" },
  { value: "365", label: "1 year" },
  { value: "730", label: "2 years" },
  { value: "1825", label: "5 years" },
  { value: "0", label: "Keep forever" },
];

export function useTimeZoneOptions(): ListOption[] {
  return useMemo(() => {
    let zones: string[] = [];
    try {
      zones = (Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf("timeZone");
    } catch {
      zones = [];
    }
    if (!zones.includes("UTC")) zones = ["UTC", ...zones];
    return zones.map((z) => {
      const [region] = z.split("/");
      return { value: z, label: z.replace(/_/g, " "), group: z.includes("/") ? region : "Other", keywords: [z] };
    });
  }, []);
}

export function SiteFields({
  value,
  onChange,
  errors,
}: {
  value: SiteInput;
  onChange: (v: SiteInput) => void;
  errors?: Partial<Record<keyof SiteInput, string>>;
}) {
  const zones = useTimeZoneOptions();
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Domain" required description="Without https:// — subdomains are counted too." error={errors?.domain}>
        <Input value={value.domain} onChange={(e) => onChange({ ...value, domain: e.target.value })} placeholder="example.com" spellCheck={false} autoCapitalize="off" />
      </Field>
      <Field label="Display name" description="Shown in the dashboard only.">
        <Input value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} placeholder={value.domain || "My website"} />
      </Field>
      <Field label="Reporting time zone" description="Days and hours in reports follow this zone." error={errors?.timezone}>
        <Combobox options={zones} value={value.timezone} onValueChange={(v) => v && onChange({ ...value, timezone: v })} searchPlaceholder="Search time zones…" />
      </Field>
      <Field label="Colour">
        <div role="radiogroup" aria-label="Site colour" className="flex flex-wrap items-center gap-2 pt-1">
          {siteColors.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={value.color?.toUpperCase() === c}
              aria-label={c}
              className="tw-swatch"
              style={{ background: c }}
              onClick={() => onChange({ ...value, color: c })}
            />
          ))}
        </div>
      </Field>
    </div>
  );
}

export function SiteSettingsPage({ site }: { site: Site }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<SiteInput>({ domain: site.domain, name: site.name, timezone: site.timezone, color: site.color, retentionDays: site.retentionDays });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = todayIn(site.timezone);
  const [exportFrom, setExportFrom] = useState(addDays(today, -29));
  const [exportTo, setExportTo] = useState(today);
  const [confirm, setConfirm] = useState<"reset" | "delete" | null>(null);
  const [typed, setTyped] = useState("");

  const dirty = form.domain !== site.domain || form.name !== site.name || form.timezone !== site.timezone || form.color !== site.color;

  const save = async (patch: Partial<SiteInput> = {}) => {
    setBusy(true);
    setError(null);
    try {
      await api.put<Site>(`/api/sites/${site.id}`, { ...form, ...patch });
      await qc.invalidateQueries({ queryKey: keys.sites });
      await qc.invalidateQueries({ predicate: (q) => q.queryKey[1] === site.id });
      toast({ title: "Settings saved", tone: "success" });
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
        toast({ title: `${site.domain} deleted`, tone: "success" });
        await qc.invalidateQueries({ queryKey: keys.sites });
        navigate("/", { replace: true });
      } else {
        await api.post(`/api/sites/${site.id}/reset`);
        toast({ title: "Statistics reset", tone: "success" });
        await qc.invalidateQueries();
      }
    } catch (e) {
      toast({ title: "Something went wrong", description: (e as Error).message, tone: "danger" });
    }
    setConfirm(null);
    setTyped("");
  };

  return (
    <div className="tw-page">
      <SiteHeader site={site} title="Site settings" />
      <div className="grid gap-4">
        <Panel title="General">
          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              void save();
            }}
            className="flex flex-col gap-4"
          >
            <SiteFields value={form} onChange={setForm} errors={error ? { domain: error } : undefined} />
            <div className="flex justify-end gap-2">
              {dirty && (
                <Button variant="ghost" onClick={() => setForm({ domain: site.domain, name: site.name, timezone: site.timezone, color: site.color, retentionDays: site.retentionDays })}>
                  Discard
                </Button>
              )}
              <AeroButton type="submit" loading={busy} disabled={!dirty}>
                Save changes
              </AeroButton>
            </div>
          </form>
        </Panel>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Data retention" description="Older statistics are deleted automatically every few hours.">
            <Field label="Keep statistics for">
              <Select
                value={String(site.retentionDays)}
                options={retentionOptions}
                onValueChange={(v) => {
                  setForm((f) => ({ ...f, retentionDays: Number(v) }));
                  void save({ retentionDays: Number(v) });
                }}
              />
            </Field>
            <p className="mb-0 mt-3 text-sm text-fg-muted">Only anonymous hourly totals are stored, so a long retention holds no personal data. Shorter periods keep the database small.</p>
          </Panel>

          <Panel title="Export data" description="Daily aggregates for every dimension, as CSV.">
            <div className="grid grid-cols-2 gap-3">
              <Field label="From">
                <DatePicker value={exportFrom} max={exportTo} onValueChange={setExportFrom} />
              </Field>
              <Field label="To">
                <DatePicker value={exportTo} min={exportFrom} max={today} onValueChange={setExportTo} />
              </Field>
            </div>
            <Button asChild variant="secondary" className="mt-4" leadingIcon={<Download size={15} />}>
              <a href={`/api/sites/${site.id}/export?from=${exportFrom}&to=${exportTo}`} download>
                Download CSV
              </a>
            </Button>
          </Panel>
        </div>

        <Panel title="Danger zone" className="!border-[var(--orb-color-danger-border)]">
          <div className="flex flex-col divide-y divide-[var(--orb-color-border-subtle)]">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
              <div>
                <p className="m-0 font-medium">Reset statistics</p>
                <p className="m-0 text-sm text-fg-muted">Delete all collected data for {site.domain}. Settings and goals are kept.</p>
              </div>
              <Button variant="secondary" leadingIcon={<RotateCcw size={15} />} onClick={() => setConfirm("reset")}>
                Reset statistics
              </Button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
              <div>
                <p className="m-0 font-medium">Delete website</p>
                <p className="m-0 text-sm text-fg-muted">Permanently remove this site, its goals and all its statistics.</p>
              </div>
              <Button variant="danger" leadingIcon={<Trash2 size={15} />} onClick={() => setConfirm("delete")}>
                Delete website
              </Button>
            </div>
          </div>
        </Panel>
      </div>

      <Dialog
        open={!!confirm}
        onOpenChange={(o) => {
          if (!o) {
            setConfirm(null);
            setTyped("");
          }
        }}
      >
        <DialogContent size="sm">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (typed.trim().toLowerCase() === site.domain) void destroy();
            }}
          >
            <DialogHeader>
              <DialogTitle>{confirm === "delete" ? `Delete ${site.domain}?` : "Reset all statistics?"}</DialogTitle>
              <DialogDescription>This can't be undone. Export your data first if you might need it.</DialogDescription>
            </DialogHeader>
            <DialogBody>
              <Field label={<>Type <b>{site.domain}</b> to confirm</>}>
                <Input value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus spellCheck={false} autoCapitalize="off" />
              </Field>
            </DialogBody>
            <DialogFooter>
              <Button variant="ghost" type="button" onClick={() => setConfirm(null)}>
                Cancel
              </Button>
              <Button variant="danger" type="submit" disabled={typed.trim().toLowerCase() !== site.domain}>
                {confirm === "delete" ? "Delete website" : "Reset statistics"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
