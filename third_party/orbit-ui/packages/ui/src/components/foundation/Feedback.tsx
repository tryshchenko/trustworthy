import { Progress as RadixProgress } from "radix-ui";
import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "../../utils/cn";

/* ---------------------------------------------------------------- Spinner */

export interface SpinnerProps extends HTMLAttributes<HTMLSpanElement> {
  size?: "sm" | "md" | "lg";
  /** Announced to assistive tech. Omit when a parent already conveys busy state. */
  label?: string;
}

export const Spinner = forwardRef<HTMLSpanElement, SpinnerProps>(function Spinner(
  { size = "md", label, className, ...props },
  ref,
) {
  return (
    <span
      ref={ref}
      className={cn("orb-spinner", `orb-spinner--${size}`, className)}
      role={label ? "status" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      {...props}
    />
  );
});

/* --------------------------------------------------------------- Skeleton */

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  width?: number | string;
  height?: number | string;
  radius?: "sm" | "md" | "lg" | "full";
  /** Render N text-like lines instead of a block. */
  lines?: number;
}

/** Placeholder shimmer. Decorative — pair with an `aria-busy` region. */
export function Skeleton({
  width,
  height,
  radius = "md",
  lines,
  className,
  style,
  ...props
}: SkeletonProps) {
  if (lines && lines > 1) {
    return (
      <div className={cn("orb-skeleton-lines", className)} aria-hidden {...props}>
        {Array.from({ length: lines }, (_, i) => (
          <span
            key={i}
            className="orb-skeleton orb-skeleton--sm"
            style={{ width: i === lines - 1 ? "62%" : "100%", height: 10 }}
          />
        ))}
      </div>
    );
  }
  return (
    <div
      aria-hidden
      className={cn("orb-skeleton", `orb-skeleton--${radius}`, className)}
      style={{ width, height, ...style }}
      {...props}
    />
  );
}

/* --------------------------------------------------------------- Progress */

export interface ProgressProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** 0–max. `null` renders an indeterminate bar. */
  value: number | null;
  max?: number;
  /** Accessible label (required unless labelled by surrounding text via aria-labelledby). */
  label?: string;
  tone?: "accent" | "success" | "warning" | "danger";
  size?: "sm" | "md";
  /** Show the percentage next to the bar. */
  showValue?: boolean;
}

export const Progress = forwardRef<HTMLDivElement, ProgressProps>(function Progress(
  { value, max = 100, label, tone = "accent", size = "md", showValue, className, ...props },
  ref,
) {
  // Clamp so out-of-range data (e.g. over-allocated points) degrades to a full bar instead of an error.
  const clamped = value == null ? null : Math.max(0, Math.min(max, value));
  const pct = clamped == null ? null : (clamped / max) * 100;
  return (
    <div className={cn("orb-progress", `orb-progress--${size}`, className)}>
      <RadixProgress.Root
        ref={ref}
        value={clamped}
        max={max}
        aria-label={label}
        className={cn("orb-progress__track", `orb-progress--${tone}`)}
        {...props}
      >
        <RadixProgress.Indicator
          className="orb-progress__bar"
          data-indeterminate={pct == null || undefined}
          style={pct == null ? undefined : { transform: `translateX(-${100 - pct}%)` }}
        />
      </RadixProgress.Root>
      {showValue && pct != null && (
        <span className="orb-progress__value" aria-hidden>
          {Math.round(pct)}%
        </span>
      )}
    </div>
  );
});

/* ------------------------------------------------------------- EmptyState */

export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Primary/secondary actions. */
  actions?: ReactNode;
  size?: "sm" | "md";
}

export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(function EmptyState(
  { icon, title, description, actions, size = "md", className, ...props },
  ref,
) {
  return (
    <div ref={ref} className={cn("orb-empty", `orb-empty--${size}`, className)} {...props}>
      {icon && (
        <div className="orb-empty__icon" aria-hidden>
          {icon}
        </div>
      )}
      <p className="orb-empty__title">{title}</p>
      {description && <p className="orb-empty__description">{description}</p>}
      {actions && <div className="orb-empty__actions">{actions}</div>}
    </div>
  );
});

/* -------------------------------------------------------------------- Kbd */

export function Kbd({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <kbd className={cn("orb-kbd", className)} {...props} />;
}

/* ---------------------------------------------------------- VisuallyHidden */

export function VisuallyHidden({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("orb-sr-only", className)} {...props} />;
}
