import { useId, useState, type FormEvent, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "../../utils/cn";
import { Button } from "../foundation/Button";
import { Avatar } from "../foundation/Display";
import type { Person } from "./types";

/* ============================================================ Time helper */

const units: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31536000],
  ["month", 2592000],
  ["week", 604800],
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
];

/** "3 hours ago" style formatting via Intl.RelativeTimeFormat. */
export function formatRelativeTime(iso: string, now: Date = new Date(), locale?: string): string {
  const diff = (new Date(iso).getTime() - now.getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  for (const [unit, secs] of units)
    if (Math.abs(diff) >= secs) return rtf.format(Math.round(diff / secs), unit);
  return "just now";
}

function Time({ iso, now }: { iso: string; now?: Date }) {
  const full = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
  return (
    <time dateTime={iso} title={full} className="orb-activity__time">
      {formatRelativeTime(iso, now)}
    </time>
  );
}

/* =========================================================== ActivityFeed */

export interface ActivityItem {
  id: string;
  actor: Pick<Person, "name" | "avatarUrl">;
  /** Sentence fragment after the actor's name, e.g. "changed status to Done". */
  action: ReactNode;
  /** ISO timestamp. */
  timestamp: string;
  icon?: ReactNode;
}

export interface ActivityFeedProps extends HTMLAttributes<HTMLOListElement> {
  items: ActivityItem[];
  /** Fixed "now" for deterministic rendering (tests, stories). */
  now?: Date;
  emptyMessage?: ReactNode;
}

/** Chronological event log. */
export function ActivityFeed({
  items,
  now,
  emptyMessage = "No activity yet.",
  className,
  ...props
}: ActivityFeedProps) {
  if (!items.length) return <p className="orb-activity__empty">{emptyMessage}</p>;
  return (
    <ol className={cn("orb-activity", className)} {...props}>
      {items.map((it) => (
        <li key={it.id} className="orb-activity__item">
          <span className="orb-activity__marker" aria-hidden>
            {it.icon ?? (
              <Avatar name={it.actor.name} src={it.actor.avatarUrl} size="xs" decorative />
            )}
          </span>
          <p className="orb-activity__text">
            <strong>{it.actor.name}</strong> {it.action} <Time iso={it.timestamp} now={now} />
          </p>
        </li>
      ))}
    </ol>
  );
}

/* ========================================================== CommentThread */

export interface Comment {
  id: string;
  author: Pick<Person, "name" | "avatarUrl">;
  body: string;
  createdAt: string;
  edited?: boolean;
}

export interface CommentThreadProps extends Omit<HTMLAttributes<HTMLDivElement>, "onSubmit"> {
  comments: Comment[];
  currentUser: Pick<Person, "name" | "avatarUrl">;
  /** Omit to render the thread read-only. */
  onSubmit?: (body: string) => void;
  now?: Date;
  placeholder?: string;
}

/** Comment list with a composer (⌘/Ctrl+Enter to send). */
export function CommentThread({
  comments,
  currentUser,
  onSubmit,
  now,
  placeholder = "Add a comment…",
  className,
  ...props
}: CommentThreadProps) {
  const [draft, setDraft] = useState("");
  const inputId = useId();
  const send = (e?: FormEvent) => {
    e?.preventDefault();
    const body = draft.trim();
    if (!body || !onSubmit) return;
    onSubmit(body);
    setDraft("");
  };
  return (
    <div className={cn("orb-comments", className)} {...props}>
      {onSubmit && (
        <form className="orb-comments__composer" onSubmit={send}>
          <Avatar name={currentUser.name} src={currentUser.avatarUrl} size="sm" decorative />
          <div className="orb-comments__field">
            <label htmlFor={inputId} className="orb-sr-only">
              Comment
            </label>
            <textarea
              id={inputId}
              className="orb-textarea orb-textarea--auto"
              rows={2}
              placeholder={placeholder}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
              }}
            />
            {draft.trim() && (
              <div className="orb-comments__actions">
                <Button size="sm" variant="ghost" onClick={() => setDraft("")}>
                  Cancel
                </Button>
                <Button size="sm" variant="primary" type="submit">
                  Comment
                </Button>
              </div>
            )}
          </div>
        </form>
      )}
      <ol
        className="orb-comments__list"
        aria-label={`${comments.length} comment${comments.length === 1 ? "" : "s"}`}
      >
        {comments.map((c) => (
          <li key={c.id} className="orb-comment">
            <Avatar name={c.author.name} src={c.author.avatarUrl} size="sm" decorative />
            <div className="orb-comment__body">
              <p className="orb-comment__meta">
                <strong>{c.author.name}</strong> <Time iso={c.createdAt} now={now} />
                {c.edited && <span className="orb-comment__edited"> · edited</span>}
              </p>
              <p className="orb-comment__text">{c.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
