import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "@orbit/icons";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { usePortalContainer } from "../../theme/ThemeProvider";
import { cn } from "../../utils/cn";

export type ToastTone = "info" | "success" | "warning" | "danger";

export interface ToastOptions {
  title: ReactNode;
  description?: ReactNode;
  tone?: ToastTone;
  /** Milliseconds before auto-dismiss. `Infinity` keeps it until dismissed. Default 5000. */
  duration?: number;
  action?: { label: string; onClick: () => void };
  id?: string;
}

export interface ToastRecord extends Required<Pick<ToastOptions, "tone" | "duration">> {
  id: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ToastOptions["action"];
  createdAt: number;
}

/* A tiny external store so `toast()` can be called from anywhere (event handlers, stores, effects). */
let toasts: ToastRecord[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
let counter = 0;

/** Show a toast notification. Returns its id. Requires a mounted `<Toaster />`. */
export function toast(options: ToastOptions): string {
  const id = options.id ?? `toast-${++counter}`;
  const record: ToastRecord = {
    id,
    title: options.title,
    description: options.description,
    tone: options.tone ?? "info",
    duration: options.duration ?? 5000,
    action: options.action,
    createdAt: Date.now(),
  };
  toasts = [...toasts.filter((t) => t.id !== id), record].slice(-5);
  emit();
  return id;
}

toast.dismiss = (id?: string) => {
  toasts = id ? toasts.filter((t) => t.id !== id) : [];
  emit();
};

export function useToasts(): ToastRecord[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => toasts,
    () => toasts,
  );
}

const icons: Record<ToastTone, ReactNode> = {
  info: <Info size={18} aria-hidden />,
  success: <CheckCircle2 size={18} aria-hidden />,
  warning: <AlertTriangle size={18} aria-hidden />,
  danger: <XCircle size={18} aria-hidden />,
};

function ToastItem({ t }: { t: ToastRecord }) {
  const [paused, setPaused] = useState(false);
  const remaining = useRef(t.duration);
  const started = useRef(Date.now());

  useEffect(() => {
    if (paused || !Number.isFinite(remaining.current)) return;
    started.current = Date.now();
    const timer = window.setTimeout(() => toast.dismiss(t.id), remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current -= Date.now() - started.current;
    };
  }, [paused, t.id]);

  return (
    // Hover/focus pause the auto-dismiss timer (WCAG 2.2.1); Escape dismisses. Children are real buttons.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <li
      className={cn("orb-toast", `orb-toast--${t.tone}`)}
      role={t.tone === "danger" ? "alert" : undefined}
      aria-atomic="true"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={(e) => e.key === "Escape" && toast.dismiss(t.id)}
    >
      <span className="orb-toast__icon">{icons[t.tone]}</span>
      <div className="orb-toast__body">
        <div className="orb-toast__title">{t.title}</div>
        {t.description && <div className="orb-toast__description">{t.description}</div>}
      </div>
      {t.action && (
        <button
          type="button"
          className="orb-button orb-button--soft orb-button--sm"
          onClick={() => {
            t.action?.onClick();
            toast.dismiss(t.id);
          }}
        >
          {t.action.label}
        </button>
      )}
      <button
        type="button"
        className="orb-button orb-button--ghost orb-button--sm orb-button--icon"
        aria-label="Dismiss notification"
        onClick={() => toast.dismiss(t.id)}
      >
        <X size={14} aria-hidden />
      </button>
    </li>
  );
}

export interface ToasterProps {
  position?: "bottom-right" | "bottom-center" | "top-right";
  className?: string;
}

/** Mount once near the app root. Renders an ARIA live region for `toast()` messages. */
export function Toaster({ position = "bottom-right", className }: ToasterProps) {
  const items = useToasts();
  const container = usePortalContainer();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(
    <section
      aria-label="Notifications"
      className={cn("orb-toaster", `orb-toaster--${position}`, className)}
    >
      <ol aria-live="polite" aria-relevant="additions">
        {items.map((t) => (
          <ToastItem key={t.id} t={t} />
        ))}
      </ol>
    </section>,
    container ?? document.body,
  );
}
