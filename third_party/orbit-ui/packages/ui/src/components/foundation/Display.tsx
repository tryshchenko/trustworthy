import { ChevronRight, X } from "@orbit/icons";
import type { Tone } from "@orbit/tokens";
import { cva, type VariantProps } from "class-variance-authority";
import { Avatar as RA, Separator as RSep, Slot } from "radix-ui";
import {
  Children,
  forwardRef,
  isValidElement,
  type ComponentPropsWithoutRef,
  type ElementRef,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "../../utils/cn";

/* =================================================================== Badge */

export type BadgeVariant = Tone | "accent";

export const badgeVariants = cva("orb-badge", {
  variants: {
    variant: {
      info: "orb-tone-info",
      success: "orb-tone-success",
      warning: "orb-tone-warning",
      danger: "orb-tone-danger",
      neutral: "orb-tone-neutral",
      discovery: "orb-tone-discovery",
      teal: "orb-tone-teal",
      accent: "orb-badge--accent",
    },
    appearance: { soft: "", solid: "orb-badge--solid", outline: "orb-badge--outline" },
    size: { sm: "orb-badge--sm", md: "" },
  },
  defaultVariants: { variant: "neutral", appearance: "soft", size: "md" },
});

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {
  icon?: ReactNode;
}

/** Compact status or count label. Never rely on colour alone — the text carries meaning. */
export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { className, variant, appearance, size, icon, children, ...props },
  ref,
) {
  return (
    <span
      ref={ref}
      className={cn(badgeVariants({ variant, appearance, size }), className)}
      {...props}
    >
      {icon && (
        <span className="orb-badge__icon" aria-hidden>
          {icon}
        </span>
      )}
      {children}
    </span>
  );
});

/* ===================================================================== Tag */

export interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  /** Any tone, or a custom CSS colour for the leading dot. */
  color?: Tone | (string & {});
  /** Renders a remove button; called when it is activated. */
  onRemove?: () => void;
  removeLabel?: string;
  size?: "sm" | "md";
}

const toneSet = new Set(["info", "success", "warning", "danger", "neutral", "discovery", "teal"]);

/** Label/category chip, optionally removable. */
export const Tag = forwardRef<HTMLSpanElement, TagProps>(function Tag(
  { className, color = "neutral", onRemove, removeLabel, size = "md", children, ...props },
  ref,
) {
  const isTone = toneSet.has(color);
  return (
    <span ref={ref} className={cn("orb-tag", `orb-tag--${size}`, className)} {...props}>
      <span
        className={cn("orb-tag__dot", isTone && `orb-tone-${color}`)}
        style={isTone ? undefined : { background: color }}
        aria-hidden
      />
      <span className="orb-tag__label">{children}</span>
      {onRemove && (
        <button
          type="button"
          className="orb-tag__remove"
          aria-label={removeLabel ?? `Remove ${typeof children === "string" ? children : "tag"}`}
          onClick={onRemove}
        >
          <X size={12} aria-hidden />
        </button>
      )}
    </span>
  );
});

/* ================================================================== Avatar */

export interface AvatarProps extends Omit<ComponentPropsWithoutRef<typeof RA.Root>, "children"> {
  name: string;
  src?: string;
  size?: "xs" | "sm" | "md" | "lg";
  /** Presence indicator. */
  status?: "online" | "away" | "offline";
  /** Hide from assistive tech when the name is rendered next to the avatar. */
  decorative?: boolean;
}

const avatarHues = [
  "#086BEE",
  "#0A93BA",
  "#0B958E",
  "#13874F",
  "#7231EF",
  "#D36806",
  "#B8152B",
  "#3F5875",
];

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return (
    (parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "")
  ).toUpperCase();
}

function hueFor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return avatarHues[h % avatarHues.length];
}

export const Avatar = forwardRef<ElementRef<typeof RA.Root>, AvatarProps>(function Avatar(
  { name, src, size = "md", status, decorative, className, style, ...props },
  ref,
) {
  return (
    <RA.Root
      ref={ref}
      className={cn("orb-avatar", `orb-avatar--${size}`, className)}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : name}
      aria-hidden={decorative || undefined}
      style={{ ["--orb-avatar-hue" as string]: hueFor(name), ...style }}
      {...props}
    >
      {src && <RA.Image src={src} alt="" className="orb-avatar__image" />}
      <RA.Fallback className="orb-avatar__fallback" delayMs={src ? 300 : 0}>
        {initials(name)}
      </RA.Fallback>
      {status && (
        <span className={cn("orb-avatar__status", `orb-avatar__status--${status}`)} aria-hidden />
      )}
    </RA.Root>
  );
});

export interface AvatarGroupProps extends HTMLAttributes<HTMLDivElement> {
  /** Maximum avatars before collapsing to "+N". */
  max?: number;
  size?: AvatarProps["size"];
}

export function AvatarGroup({
  max = 4,
  size = "sm",
  className,
  children,
  ...props
}: AvatarGroupProps) {
  const items = Children.toArray(children).filter(isValidElement);
  const shown = items.slice(0, max);
  const rest = items.length - shown.length;
  return (
    <div className={cn("orb-avatar-group", className)} role="group" {...props}>
      {shown}
      {rest > 0 && (
        <span
          className={cn("orb-avatar", `orb-avatar--${size}`, "orb-avatar--more")}
          aria-label={`${rest} more`}
        >
          +{rest}
        </span>
      )}
    </div>
  );
}

/* ==================================================================== Card */

export const cardVariants = cva("orb-card", {
  variants: {
    variant: {
      /** Opaque surface — default for dense content. */
      solid: "orb-card--solid",
      /** Frosted glass. Use sparingly and never for long lists. */
      glass: "orb-material-standard",
      /** Flat, tinted, no shadow. */
      sunken: "orb-card--sunken",
      outline: "orb-card--outline",
    },
    padding: { none: "orb-pad-none", sm: "orb-pad-sm", md: "orb-pad-md", lg: "orb-pad-lg" },
    interactive: { true: "orb-card--interactive" },
    selected: { true: "orb-card--selected" },
  },
  defaultVariants: { variant: "solid", padding: "md" },
});

export interface CardProps
  extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {
  asChild?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, variant, padding, interactive, selected, asChild, ...props },
  ref,
) {
  const Comp = asChild ? Slot.Root : "div";
  return (
    <Comp
      ref={ref}
      className={cn(cardVariants({ variant, padding, interactive, selected }), className)}
      {...props}
    />
  );
});

/* =================================================================== Panel */

export interface PanelProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  title?: ReactNode;
  description?: ReactNode;
  /** Actions shown in the panel header (buttons, menus). */
  actions?: ReactNode;
  footer?: ReactNode;
  variant?: "solid" | "glass";
  /** Heading level for the title. Defaults to 2. */
  headingLevel?: 2 | 3 | 4;
  bodyClassName?: string;
}

/** Titled content region (`<section>`), e.g. a dashboard widget or settings group. */
export const Panel = forwardRef<HTMLElement, PanelProps>(function Panel(
  {
    title,
    description,
    actions,
    footer,
    variant = "solid",
    headingLevel = 2,
    className,
    bodyClassName,
    children,
    ...props
  },
  ref,
) {
  const H = `h${headingLevel}` as const;
  return (
    <section
      ref={ref}
      className={cn(
        "orb-panel",
        variant === "glass" ? "orb-material-standard" : "orb-card--solid",
        className,
      )}
      {...props}
    >
      {(title || actions) && (
        <header className="orb-panel__header">
          <div className="orb-panel__titles">
            {title && <H className="orb-panel__title">{title}</H>}
            {description && <p className="orb-panel__description">{description}</p>}
          </div>
          {actions && <div className="orb-panel__actions">{actions}</div>}
        </header>
      )}
      <div className={cn("orb-panel__body", bodyClassName)}>{children}</div>
      {footer && <footer className="orb-panel__footer">{footer}</footer>}
    </section>
  );
});

/* =============================================================== Separator */

export interface SeparatorProps extends ComponentPropsWithoutRef<typeof RSep.Root> {
  /** Use a soft luminous gradient line instead of a flat hairline. */
  glow?: boolean;
}

export const Separator = forwardRef<ElementRef<typeof RSep.Root>, SeparatorProps>(
  function Separator(
    { className, orientation = "horizontal", decorative = true, glow, ...props },
    ref,
  ) {
    return (
      <RSep.Root
        ref={ref}
        orientation={orientation}
        decorative={decorative}
        className={cn(
          "orb-separator",
          `orb-separator--${orientation}`,
          glow && "orb-separator--glow",
          className,
        )}
        {...props}
      />
    );
  },
);

/* ============================================================== Breadcrumb */

export interface BreadcrumbItem {
  label: ReactNode;
  href?: string;
  icon?: ReactNode;
  onClick?: () => void;
}

export interface BreadcrumbProps extends HTMLAttributes<HTMLElement> {
  items: BreadcrumbItem[];
  /** Custom link renderer (e.g. a router Link). */
  renderLink?: (item: BreadcrumbItem, children: ReactNode) => ReactNode;
}

export function Breadcrumb({ items, renderLink, className, ...props }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn("orb-breadcrumb", className)} {...props}>
      <ol>
        {items.map((item, i) => {
          const last = i === items.length - 1;
          const content = (
            <>
              {item.icon && (
                <span className="orb-breadcrumb__icon" aria-hidden>
                  {item.icon}
                </span>
              )}
              {item.label}
            </>
          );
          return (
            <li key={i}>
              {last ? (
                <span aria-current="page" className="orb-breadcrumb__current">
                  {content}
                </span>
              ) : renderLink ? (
                renderLink(item, content)
              ) : item.href ? (
                <a href={item.href} onClick={item.onClick} className="orb-breadcrumb__link">
                  {content}
                </a>
              ) : item.onClick ? (
                <button type="button" onClick={item.onClick} className="orb-breadcrumb__link">
                  {content}
                </button>
              ) : (
                <span className="orb-breadcrumb__text">{content}</span>
              )}
              {!last && <ChevronRight size={14} aria-hidden className="orb-breadcrumb__sep" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
