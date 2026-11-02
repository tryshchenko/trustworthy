/* The whole component kit: a few primitives over native elements. */
import {
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ButtonHTMLAttributes,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { Link } from "./lib/router";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/* ------------------------------------------------------------------ icons */

const paths = {
  "arrow-up-right": "M4.5 11.5 11.5 4.5M5.5 4.5h6v6",
  "arrow-down-right": "M4.5 4.5l7 7M11.5 5.5v6h-6",
  "arrow-right": "M2.5 8h11M9 3.5 13.5 8 9 12.5",
  "chevron-down": "m4 6 4 4 4-4",
  "chevron-left": "m10 3.5-4.5 4.5 4.5 4.5",
  "chevron-right": "m6 3.5 4.5 4.5-4.5 4.5",
  x: "M4 4l8 8M12 4l-8 8",
  check: "m3 8.5 3 3 7-7",
  plus: "M8 3v10M3 8h10",
  minus: "M3.5 8h9",
  copy: "M5.5 5.5h8v8h-8zM2.5 10.5v-8h8",
  download: "M8 2.5v8M4.5 7 8 10.5 11.5 7M2.5 13.5h11",
  search: "M7 11.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zM10.5 10.5l3 3",
  table: "M2.5 3.5h11v9h-11zM2.5 6.5h11M2.5 9.5h11M6.5 3.5v9",
  chart: "M2.5 13.5h11M2.5 11l3.5-4 3 2.5 4.5-6",
  filter: "M2.5 4h11M4.5 8h7M6.5 12h3",
  expand: "M9.5 2.5h4v4M6.5 13.5h-4v-4M13.5 2.5 9 7M2.5 13.5 7 9",
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, label, className }: { name: IconName; label?: string; className?: string }) {
  return (
    <svg className={cx("icon", className)} viewBox="0 0 16 16" aria-hidden={label ? undefined : true} aria-label={label} role={label ? "img" : undefined}>
      <path d={paths[name]} />
    </svg>
  );
}

/** A watch dial whose hand sweeps — the loading indicator. */
export function Dial({ large, label = "Loading" }: { large?: boolean; label?: string }) {
  return <span className={cx("dial", large && "dial--lg")} role="status" aria-label={label} />;
}

/* ------------------------------------------------------------------ buttons */

type Variant = "default" | "primary" | "rule" | "quiet" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md";
  icon?: boolean;
  busy?: boolean;
}

export function Button({ variant = "default", size = "md", icon, busy, className, children, disabled, type = "button", ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={cx("btn", variant !== "default" && `btn--${variant}`, size === "sm" && "btn--sm", icon && "btn--icon", className)}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...rest}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "default",
  size = "md",
  className,
  external,
  children,
  ...rest
}: { href: string; variant?: Variant; size?: "sm" | "md"; className?: string; external?: boolean; children: ReactNode } & Omit<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  "href"
>) {
  const cls = cx("btn", variant !== "default" && `btn--${variant}`, size === "sm" && "btn--sm", className);
  if (external || rest.download !== undefined)
    return (
      <a href={href} className={cls} {...(external ? { target: "_blank", rel: "noreferrer noopener" } : {})} {...rest}>
        {children}
      </a>
    );
  return (
    <Link href={href} className={cls} {...rest}>
      {children}
    </Link>
  );
}

/* ------------------------------------------------------------------ forms */

interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  children: ReactElement<Record<string, unknown>>;
}

/** Label, control, hint and error, wired together for assistive tech. */
export function Field({ label, hint, error, required, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  const control = isValidElement(children)
    ? cloneElement(children, {
        id,
        "aria-describedby": [hintId, errId].filter(Boolean).join(" ") || undefined,
        "aria-invalid": error ? true : undefined,
        required,
      })
    : children;
  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label}
      </label>
      {control}
      {hint && (
        <span id={hintId} className="field__hint">
          {hint}
        </span>
      )}
      {error && (
        <span id={errId} className="field__error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

export function Checkbox({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <b>{label}</b>
        {hint && <small>{hint}</small>}
      </span>
    </label>
  );
}

/* ------------------------------------------------------------------ tabs */

export function Tabs<T extends string>({ value, onChange, items, label }: { value: T; onChange: (v: T) => void; items: { value: T; label: string }[]; label: string }) {
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const i = items.findIndex((t) => t.value === value);
    const next = items[(i + (e.key === "ArrowRight" ? 1 : items.length - 1)) % items.length]!;
    onChange(next.value);
    (e.currentTarget.querySelector(`[data-v="${next.value}"]`) as HTMLButtonElement | null)?.focus();
  };
  return (
    <div className="tabs" role="tablist" aria-label={label} onKeyDown={onKey}>
      {items.map((t) => (
        <button key={t.value} type="button" role="tab" data-v={t.value} aria-selected={t.value === value} tabIndex={t.value === value ? 0 : -1} onClick={() => onChange(t.value)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ popover */

/** A click-to-open panel anchored under its trigger. Closes on Escape and outside clicks. */
export function Popover({
  open,
  onOpenChange,
  trigger,
  children,
  align = "start",
  className,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  trigger: (props: { "aria-expanded": boolean; "aria-haspopup": "dialog"; onClick: () => void }) => ReactNode;
  children: ReactNode;
  align?: "start" | "end";
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && onOpenChange(false);
    const key = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
        (ref.current?.querySelector("[aria-expanded]") as HTMLElement | null)?.focus();
      }
    };
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("keydown", key);
    };
  }, [open, onOpenChange]);
  return (
    <div className={cx("pop", className)} ref={ref}>
      {trigger({ "aria-expanded": open, "aria-haspopup": "dialog", onClick: () => onOpenChange(!open) })}
      {open && (
        <div className="pop__panel" data-align={align}>
          {children}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ dialog */

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  wide,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  onSubmit?: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  const inner = (
    <>
      <div className="dialog__head">
        <div className="spacer">
          <h2 id={titleId} className="h2">
            {title}
          </h2>
          {description && <p>{description}</p>}
        </div>
        <Button variant="quiet" icon onClick={onClose} aria-label="Close">
          <Icon name="x" />
        </Button>
      </div>
      {children && <div className="dialog__body">{children}</div>}
      {footer && <div className="dialog__foot">{footer}</div>}
    </>
  );
  return (
    <dialog
      ref={ref}
      className={cx("dialog", wide && "dialog--wide")}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === ref.current && onClose()}
    >
      {open &&
        (onSubmit ? (
          <form
            className="dialog__inner"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit();
            }}
          >
            {inner}
          </form>
        ) : (
          <div className="dialog__inner">{inner}</div>
        ))}
    </dialog>
  );
}

/* ------------------------------------------------------------------ toast */

interface ToastItem {
  id: number;
  title: string;
  detail?: string;
  tone?: "danger";
}
let toasts: ToastItem[] = [];
let seq = 0;
const subs = new Set<() => void>();
const emit = () => subs.forEach((s) => s());

export function toast(title: string, opts: { detail?: string; tone?: "danger" } = {}) {
  const id = ++seq;
  toasts = [...toasts.slice(-2), { id, title, ...opts }];
  emit();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  }, 3600);
}

export function Toaster() {
  const items = useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => toasts,
  );
  return (
    <div className="toaster" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className="toast" data-tone={t.tone}>
          <span>{t.title}</span>
          {t.detail && <small>{t.detail}</small>}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ misc */

export function Skeleton({ width = "100%", height = 16 }: { width?: number | string; height?: number | string }) {
  return <span className="skeleton" style={{ width, height }} aria-hidden />;
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <p className="empty__title">{title}</p>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast("Copy failed — select the text and copy it manually", { tone: "danger" });
    }
  };
  return (
    <Button size="sm" icon onClick={() => void copy()} aria-label={copied ? "Copied" : "Copy to clipboard"} title={copied ? "Copied" : "Copy"}>
      <Icon name={copied ? "check" : "copy"} />
    </Button>
  );
}

export function Code({ text, children, label, prose }: { text: string; children?: ReactNode; label: string; prose?: boolean }) {
  return (
    <div className={cx("code", prose && "code--prose")}>
      <pre aria-label={label}>
        <code>{children ?? text}</code>
      </pre>
      <CopyButton text={text} />
    </div>
  );
}
