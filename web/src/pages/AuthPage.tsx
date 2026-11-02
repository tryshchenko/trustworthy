import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, ApiError } from "../lib/api";
import { keys } from "../lib/queries";
import { Button, Field } from "../ui";

type Mode = "login" | "setup" | "error";

export function AuthPage({ mode, error: loadError }: { mode: Mode; error?: string }) {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
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
    <div className="auth">
      <header className="site-header">
        <div className="container nav-wrap">
          <span className="wordmark">Trustworthy</span>
          <span className="eyebrow" style={{ marginLeft: "auto" }}>
            Self-hosted analytics
          </span>
        </div>
      </header>
      <main id="main" className="container auth__main">
        <div>
          <p className="eyebrow" style={{ marginBottom: "1.5rem" }}>
            No cookies · No identifiers · No third parties
          </p>
          <h1 className="auth__title">Pages, not people.</h1>
          <p className="auth__copy">
            Know which pages are read and where readers come from — without following anyone around. Everything stays on this server.
          </p>
        </div>

        {mode === "error" ? (
          <div className="auth__form">
            <h2 className="h2">Can't reach the server</h2>
            <p className="muted">{loadError ?? "Please check that the service is running."}</p>
            <Button variant="primary" onClick={() => void qc.invalidateQueries()}>
              Try again
            </Button>
          </div>
        ) : (
          <form
            className="auth__form"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <div>
              <h2 className="h2">{mode === "setup" ? "Create the owner account" : "Sign in"}</h2>
              <p className="muted small" style={{ marginTop: "0.4rem" }}>
                {mode === "setup" ? "This installation has one owner. You'll use these details to sign in." : "Welcome back."}
              </p>
            </div>
            {mode === "setup" && (
              <Field
                label="Setup code"
                required
                hint={
                  <>
                    Printed in the server logs on first start (in Coolify: your application → Logs). Look for <span className="code-inline">setup_code</span>.
                  </>
                }
              >
                <input
                  className="input input--mono"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="XXXX-XXXX-XXXX"
                  autoComplete="one-time-code"
                  autoFocus
                  spellCheck={false}
                />
              </Field>
            )}
            <Field label="Email" required>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete={mode === "setup" ? "email" : "username"}
                autoFocus={mode === "login"}
              />
            </Field>
            <Field label="Password" required hint={mode === "setup" ? "At least 10 characters. A passphrase works well." : undefined}>
              <PasswordInput value={password} onChange={setPassword} show={show} onShow={setShow} autoComplete={mode === "setup" ? "new-password" : "current-password"} />
            </Field>
            {error && (
              <p role="alert" className="alert">
                {error}
              </p>
            )}
            <Button type="submit" variant="primary" busy={busy}>
              {mode === "setup" ? "Create account" : "Sign in"}
            </Button>
          </form>
        )}
      </main>
      <footer className="auth__foot">
        <div className="container">This installation sets no cookies on the sites it measures — only a session cookie here, for you.</div>
      </footer>
    </div>
  );
}

function PasswordInput({
  value,
  onChange,
  show,
  onShow,
  autoComplete,
  ...aria
}: {
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onShow: (v: boolean) => void;
  autoComplete: string;
  id?: string;
  required?: boolean;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}) {
  return (
    <span className="input-wrap">
      <input className="input" type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} {...aria} />
      <Button variant="quiet" size="sm" onClick={() => onShow(!show)} aria-label={show ? "Hide password" : "Show password"}>
        {show ? "Hide" : "Show"}
      </Button>
    </span>
  );
}
