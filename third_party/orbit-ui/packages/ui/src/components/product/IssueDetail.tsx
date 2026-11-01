import { Pencil } from "@orbit/icons";
import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { cn } from "../../utils/cn";

/* ============================================================ EditableText */

export interface EditableTextProps {
  value: string;
  onCommit: (value: string) => void;
  /** Accessible name, e.g. "Issue title". */
  label: string;
  placeholder?: string;
  multiline?: boolean;
  /** Element used in read mode. */
  as?: "h1" | "h2" | "h3" | "p" | "div";
  className?: string;
  /** Reject empty values (keeps the previous value). Default true for single-line. */
  required?: boolean;
  /** Render read-mode content (e.g. formatted description). */
  renderValue?: (value: string) => ReactNode;
}

/**
 * Click-to-edit text. Read mode is a real button (keyboard reachable); edit mode
 * commits on Enter (⌘/Ctrl+Enter when multiline) or blur and cancels on Escape.
 */
export function EditableText({
  value,
  onCommit,
  label,
  placeholder = "Add…",
  multiline = false,
  as: Tag = "div",
  className,
  required = !multiline,
  renderValue,
}: EditableTextProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const fieldRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const errorId = useId();

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  // Only restore focus to the trigger when editing ended via keyboard, not by clicking elsewhere.
  const fieldHadFocus = useRef(false);
  const wasEditing = useRef(false);
  useEffect(() => {
    if (editing) {
      fieldRef.current?.focus();
      fieldRef.current?.select();
    } else if (wasEditing.current && fieldHadFocus.current) {
      triggerRef.current?.focus();
    }
    wasEditing.current = editing;
  }, [editing]);

  const finish = (commit: boolean) => {
    if (commit) {
      const next = multiline ? draft : draft.trim();
      if (required && !next.trim()) {
        setError(`${label} is required`);
        fieldRef.current?.focus();
        return;
      }
      if (next !== value) onCommit(next);
    }
    setError(null);
    setEditing(false);
    setDraft(value);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    fieldHadFocus.current = e.key === "Escape" || e.key === "Enter";
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setDraft(value);
      finish(false);
    } else if (e.key === "Enter" && (!multiline || e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      finish(true);
    }
  };

  if (editing) {
    const common = {
      ref: fieldRef,
      value: draft,
      "aria-label": label,
      "aria-invalid": error ? true : undefined,
      "aria-describedby": error ? errorId : undefined,
      placeholder,
      onChange: (e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) => {
        setDraft(e.target.value);
        if (error) setError(null);
      },
      onKeyDown,
      // Blurring with an invalid value reverts instead of trapping focus.
      onBlur: () => (required && !draft.trim() ? finish(false) : finish(true)),
    };
    return (
      <div className={cn("orb-editable orb-editable--editing", `orb-editable--${Tag}`, className)}>
        {multiline ? (
          <textarea {...common} rows={5} className="orb-textarea orb-textarea--auto" />
        ) : (
          <input {...common} className="orb-editable__input" />
        )}
        {error ? (
          <p id={errorId} role="alert" className="orb-field__error">
            {error}
          </p>
        ) : (
          multiline && (
            <p className="orb-field__description">
              Press <kbd className="orb-kbd">⌘</kbd>
              <kbd className="orb-kbd">↵</kbd> to save, <kbd className="orb-kbd">esc</kbd> to cancel
            </p>
          )
        )}
      </div>
    );
  }

  return (
    <Tag className={cn("orb-editable", `orb-editable--${Tag}`, className)}>
      <button
        ref={triggerRef}
        type="button"
        className="orb-editable__trigger"
        onClick={() => setEditing(true)}
        aria-label={`${label}: ${value || "empty"}. Activate to edit`}
      >
        <span className={cn("orb-editable__value", !value && "orb-editable__placeholder")}>
          {value ? (renderValue ? renderValue(value) : value) : placeholder}
        </span>
        <Pencil size={14} aria-hidden className="orb-editable__icon" />
      </button>
    </Tag>
  );
}

/* ============================================================ PropertyList */

export interface PropertyItem {
  label: ReactNode;
  value: ReactNode;
  /** id of the control inside `value`, so the label becomes a real <label>. */
  controlId?: string;
}

export function PropertyList({ items, className }: { items: PropertyItem[]; className?: string }) {
  return (
    <dl className={cn("orb-props", className)}>
      {items.map((item, i) => (
        <div key={i} className="orb-props__row">
          <dt className="orb-props__label">
            {item.controlId ? <label htmlFor={item.controlId}>{item.label}</label> : item.label}
          </dt>
          <dd className="orb-props__value">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ====================================================== IssueDetailPanel */

export interface IssueDetailPanelProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /** Usually an `<EditableText as="h2">` for the title. */
  title: ReactNode;
  /** Row under the title: status selector, quick actions. */
  toolbar?: ReactNode;
  /** Property list items (assignee, priority, due date…). */
  properties?: PropertyItem[];
  /** Main body: description, subtasks, comments — compose with `IssueDetailSection`. */
  children?: ReactNode;
  /** Two-column layout on wide containers. Default `stacked`. */
  layout?: "stacked" | "split";
}

/** Layout for issue details. Purely presentational — wire your own state into the slots. */
export const IssueDetailPanel = forwardRef<HTMLDivElement, IssueDetailPanelProps>(
  function IssueDetailPanel(
    { title, toolbar, properties, layout = "stacked", className, children, ...props },
    ref,
  ) {
    return (
      <div
        ref={ref}
        className={cn("orb-issue-detail", `orb-issue-detail--${layout}`, className)}
        {...props}
      >
        <div className="orb-issue-detail__title">{title}</div>
        {toolbar && <div className="orb-issue-detail__toolbar">{toolbar}</div>}
        <div className="orb-issue-detail__grid">
          {properties && properties.length > 0 && (
            <section className="orb-issue-detail__props" aria-label="Details">
              <PropertyList items={properties} />
            </section>
          )}
          <div className="orb-issue-detail__main">{children}</div>
        </div>
      </div>
    );
  },
);

export interface IssueDetailSectionProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  title: ReactNode;
  /** Count or meta next to the title. */
  meta?: ReactNode;
  actions?: ReactNode;
}

export function IssueDetailSection({
  title,
  meta,
  actions,
  className,
  children,
  ...props
}: IssueDetailSectionProps) {
  const id = useId();
  return (
    <section aria-labelledby={id} className={cn("orb-issue-section", className)} {...props}>
      <header className="orb-issue-section__header">
        <h3 id={id} className="orb-issue-section__title">
          {title}
          {meta != null && <span className="orb-issue-section__meta">{meta}</span>}
        </h3>
        {actions}
      </header>
      {children}
    </section>
  );
}
