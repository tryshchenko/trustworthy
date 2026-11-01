import { ArrowRight, Cookie, Fingerprint, Globe, Server } from "@orbit/icons";
import { AeroButton, Button, GlassPanel } from "@orbit/ui";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { api, ApiError, type Site, type SiteInput } from "../lib/api";
import { keys } from "../lib/queries";
import { navigate } from "../lib/router";
import { SiteFields, siteColors } from "./SiteSettingsPage";

function browserZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function NewSitePage({ first }: { first: boolean }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<SiteInput>({ domain: "", name: "", timezone: browserZone(), color: siteColors[0] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const site = await api.post<Site>("/api/sites", form);
      await qc.invalidateQueries({ queryKey: keys.sites });
      navigate(`/sites/${site.id}/install`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't add the website");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="tw-page max-w-3xl! pt-2 sm:pt-6">
      <div className="px-1">
        <p className="orb-type-overline m-0 text-accent-fg">{first ? "Welcome to Trustworthy" : "New website"}</p>
        <h1 className="orb-type-page-title m-0 mt-1">{first ? "Let's add your first website" : "Add a website"}</h1>
        <p className="m-0 mt-1 text-fg-muted">You'll get a tracking snippet next. It takes about a minute.</p>
      </div>

      <GlassPanel variant="solid" elevation="raised" padding="lg" radius="xl" border="hairline">
        <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
          <SiteFields value={form} onChange={setForm} errors={error ? { domain: error } : undefined} />
          <div className="flex items-center justify-end gap-2">
            {!first && (
              <Button variant="ghost" onClick={() => history.back()}>
                Cancel
              </Button>
            )}
            <AeroButton type="submit" size="lg" loading={busy} disabled={!form.domain.trim()} trailingIcon={<ArrowRight size={16} />} leadingIcon={<Globe size={16} />}>
              Add website
            </AeroButton>
          </div>
        </form>
      </GlassPanel>

      {first && (
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { icon: <Cookie size={18} />, title: "No cookies, no storage", text: "Nothing is written to visitors' devices." },
            { icon: <Fingerprint size={18} />, title: "No identifiers", text: "Visits can't be linked to people or each other." },
            { icon: <Server size={18} />, title: "Your server only", text: "No third parties, no telemetry, no external calls." },
          ].map((f) => (
            <div key={f.title} className="flex gap-3 rounded-xl border border-line bg-surface p-4">
              <span className="tw-glyph" style={{ width: 32, height: 32, color: "var(--orb-color-accent-text)", background: "var(--orb-color-accent-soft)" }} aria-hidden>
                {f.icon}
              </span>
              <div>
                <p className="m-0 text-sm font-semibold">{f.title}</p>
                <p className="m-0 text-sm text-fg-muted">{f.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
