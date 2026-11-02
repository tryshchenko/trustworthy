import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, ApiError } from "../lib/api";
import { keys } from "../lib/queries";
import { Button, Field, toast } from "../ui";

export function AccountPage({ email: initialEmail, version }: { email: string; version: string }) {
  const qc = useQueryClient();
  const [email, setEmail] = useState(initialEmail);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.put("/api/account", { email, currentPassword: current, newPassword: next || undefined });
      setCurrent("");
      setNext("");
      toast(next ? "Password changed. Other devices were signed out." : "Account updated");
      await qc.invalidateQueries({ queryKey: keys.session });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't update account");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="page-head">
        <p className="eyebrow">Owner</p>
        <h1 className="display">Account</h1>
        <p className="lede">This installation has a single owner.</p>
      </div>

      <section className="split">
        <header>
          <h2 className="h3">Sign-in details</h2>
          <p>Changing the password signs out every other device.</p>
        </header>
        <form
          noValidate
          style={{ maxWidth: "30rem" }}
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <div className="stack" style={{ gap: "1.25rem" }}>
            <Field label="Email">
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
            </Field>
            <Field label="New password" hint="Leave empty to keep the current one. At least 10 characters.">
              <input className="input" type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
            </Field>
            <Field label="Current password" required error={error}>
              <input className="input" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
            </Field>
          </div>
          <div className="form-actions">
            <Button type="submit" variant="primary" busy={busy} disabled={!current}>
              Save
            </Button>
          </div>
        </form>
      </section>

      <section className="split">
        <header>
          <h2 className="h3">About</h2>
        </header>
        <dl className="dl">
          <dt>Version</dt>
          <dd className="num">{version}</dd>
          <dt>Telemetry</dt>
          <dd>None. This installation makes no outbound requests.</dd>
        </dl>
      </section>
    </>
  );
}
