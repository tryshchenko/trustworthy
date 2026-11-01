import { AeroButton, Field, Input, Panel, Switch, toast, useTheme } from "@orbit/ui";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { api, ApiError } from "../lib/api";
import { keys } from "../lib/queries";

export function AccountPage({ email: initialEmail, version }: { email: string; version: string }) {
  const qc = useQueryClient();
  const { transparency, setTransparency, motion, setMotion } = useTheme();
  const [email, setEmail] = useState(initialEmail);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.put("/api/account", { email, currentPassword: current, newPassword: next || undefined });
      setCurrent("");
      setNext("");
      toast({ title: next ? "Password changed — other devices were signed out" : "Account updated", tone: "success" });
      await qc.invalidateQueries({ queryKey: keys.session });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't update account");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="tw-page">
      <div className="px-1 pt-1">
        <h1 className="orb-type-page-title m-0">Account</h1>
        <p className="m-0 text-sm text-fg-muted">This installation has a single owner.</p>
      </div>
      <div className="grid max-w-5xl gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel title="Sign-in details">
          <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
            <Field label="Email">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
            </Field>
            <Field label="New password" description="Leave empty to keep your current password. At least 10 characters.">
              <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
            </Field>
            <Field label="Current password" required error={error ?? undefined}>
              <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
            </Field>
            <div className="flex justify-end">
              <AeroButton type="submit" loading={busy} disabled={!current}>
                Save
              </AeroButton>
            </div>
          </form>
        </Panel>
        <div className="flex flex-col gap-4">
          <Panel title="Appearance" description="Stored in this browser only.">
            <div className="flex flex-col gap-4">
              <Switch
                label="Reduce transparency"
                description="Replace frosted glass with solid surfaces. Also follows your system setting."
                checked={transparency === "reduced"}
                onCheckedChange={(c) => setTransparency(c ? "reduced" : "auto")}
              />
              <Switch
                label="Reduce motion"
                description="Turn off transitions and the live pulse. Also follows your system setting."
                checked={motion === "reduced"}
                onCheckedChange={(c) => setMotion(c ? "reduced" : "auto")}
              />
            </div>
          </Panel>
          <Panel title="About">
            <dl className="tw-dl">
              <dt>Version</dt>
              <dd className="tabular">{version}</dd>
              <dt>Telemetry</dt>
              <dd>None. This installation makes no outbound requests.</dd>
            </dl>
          </Panel>
        </div>
      </div>
    </div>
  );
}
