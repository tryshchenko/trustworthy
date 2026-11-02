import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, ApiError, type Site, type SiteInput } from "../lib/api";
import { keys } from "../lib/queries";
import { navigate } from "../lib/router";
import { Button, Icon } from "../ui";
import { SiteFields } from "./SiteSettingsPage";

function browserZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function NewSitePage({ first }: { first: boolean }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<SiteInput>({ domain: "", name: "", timezone: browserZone() });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
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
    <>
      <div className="page-head">
        <p className="eyebrow">{first ? "Welcome" : "New website"}</p>
        <h1 className="display">{first ? "Add your first website" : "Add a website"}</h1>
        <p className="lede">You'll get a tracking snippet next. It takes about a minute.</p>
      </div>

      <section className="split">
        <header>
          <h2 className="h3">Website</h2>
          <p>Only pages on this domain and its subdomains can send data.</p>
        </header>
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <SiteFields value={form} onChange={setForm} errors={error ? { domain: error } : undefined} />
          <div className="form-actions">
            {!first && (
              <Button variant="quiet" onClick={() => history.back()}>
                Cancel
              </Button>
            )}
            <Button type="submit" variant="primary" busy={busy} disabled={!form.domain.trim()}>
              Add website <Icon name="arrow-right" />
            </Button>
          </div>
        </form>
      </section>

      {first && (
        <ol className="numbered numbered--3 section-gap">
          {[
            ["No cookies, no storage", "Nothing is written to visitors' devices."],
            ["No identifiers", "Visits can't be linked to people or to each other."],
            ["Your server only", "No third parties, no telemetry, no external calls."],
          ].map(([title, text], i) => (
            <li key={title}>
              <span className="n">0{i + 1}</span>
              <h3 className="h3">{title}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
