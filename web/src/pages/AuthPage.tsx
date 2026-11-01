import { Eye, EyeOff, KeyRound, ShieldCheck } from "@orbit/icons";
import { AeroBackground, AeroButton, Field, GlassPanel, IconButton, Input } from "@orbit/ui";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { BrandMark } from "../components/Brand";
import { api, ApiError } from "../lib/api";
import { keys } from "../lib/queries";

type Mode = "login" | "setup" | "error";

export function AuthPage({ mode, error: loadError }: { mode: Mode; error?: string }) {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "setup") await api.post("/api/setup", { email, password, setupCode: code });
      else await api.post("/api/login", { email, password });
      await qc.invalidateQueries({ queryKey: keys.session });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="tw-auth">
      <AeroBackground />
      <main className="tw-auth__card">
        <div className="mb-6 flex flex-col items-center gap-3 text-center" style={{ color: "#EEF6FC" }}>
          <BrandMark size={52} />
          <div>
            <h1 className="m-0 text-2xl font-semibold tracking-tight">Trustworthy</h1>
            <p className="m-0 mt-1 text-sm" style={{ color: "#B6CDE0" }}>
              Privacy-first analytics. No cookies, no tracking of people.
            </p>
          </div>
        </div>

        <GlassPanel variant="raised" elevation="floating" padding="lg" radius="2xl">
          {mode === "error" ? (
            <div className="flex flex-col gap-2">
              <h2 className="orb-type-section-title m-0">Can't reach the server</h2>
              <p className="m-0 text-sm text-fg-muted">{loadError ?? "Please check that the service is running."}</p>
              <AeroButton className="mt-3" onClick={() => void qc.invalidateQueries()}>
                Try again
              </AeroButton>
            </div>
          ) : (
            <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
              <div>
                <h2 className="orb-type-section-title m-0">{mode === "setup" ? "Create your owner account" : "Welcome back"}</h2>
                <p className="m-0 mt-1 text-sm text-fg-muted">
                  {mode === "setup"
                    ? "This installation has one owner. You'll use these details to sign in."
                    : "Sign in to see your websites."}
                </p>
              </div>
              {mode === "setup" && (
                <Field
                  label="Setup code"
                  required
                  description={
                    <>
                      Printed in the server logs on first start (in Coolify: your application → <b>Logs</b>). Look for{" "}
                      <span className="tw-inline-code">setup_code</span>.
                    </>
                  }
                >
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="XXXX-XXXX-XXXX"
                    autoComplete="one-time-code"
                    leading={<KeyRound size={16} />}
                    autoFocus
                    spellCheck={false}
                    style={{ fontFamily: "var(--orb-font-mono)", letterSpacing: "0.06em" }}
                  />
                </Field>
              )}
              <Field label="Email" required>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete={mode === "setup" ? "email" : "username"}
                  autoFocus={mode === "login"}
                />
              </Field>
              <Field label="Password" required description={mode === "setup" ? "At least 10 characters. A passphrase works well." : undefined}>
                <Input
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "setup" ? "new-password" : "current-password"}
                  trailing={
                    <IconButton
                      size="sm"
                      variant="ghost"
                      label={show ? "Hide password" : "Show password"}
                      icon={show ? <EyeOff size={16} /> : <Eye size={16} />}
                      onClick={() => setShow((s) => !s)}
                      tooltip={false}
                    />
                  }
                />
              </Field>
              {error && (
                <p role="alert" className="m-0 rounded-md px-3 py-2 text-sm" style={{ background: "var(--orb-color-danger-bg)", color: "var(--orb-color-danger-fg)" }}>
                  {error}
                </p>
              )}
              <AeroButton type="submit" size="lg" loading={busy} fullWidth>
                {mode === "setup" ? "Create account" : "Sign in"}
              </AeroButton>
            </form>
          )}
        </GlassPanel>
        <p className="mt-5 flex items-center justify-center gap-1.5 text-xs" style={{ color: "#A2BCD2" }}>
          <ShieldCheck size={14} aria-hidden /> Self-hosted. Your data never leaves this server.
        </p>
      </main>
    </div>
  );
}
