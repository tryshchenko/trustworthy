import { ChevronDown, PanelLeftClose, PanelLeftOpen } from "@orbit/icons";
import {
  createContext,
  forwardRef,
  useContext,
  useId,
  type AnchorHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "../../utils/cn";
import { useControllableState } from "../../utils/use-controllable-state";
import { Tooltip } from "../foundation/Overlays";

interface SidebarContextValue {
  compact: boolean;
}
const SidebarContext = createContext<SidebarContextValue>({ compact: false });
export const useSidebar = () => useContext(SidebarContext);

/* ============================================================= AeroSidebar */

export interface AeroSidebarProps extends HTMLAttributes<HTMLElement> {
  /** Workspace/logo area pinned to the top. */
  header?: ReactNode;
  /** `SidebarItem`s pinned to the bottom (settings, help). */
  footer?: ReactNode;
  /** Icon-only rail. */
  compact?: boolean;
  defaultCompact?: boolean;
  onCompactChange?: (compact: boolean) => void;
  /** Show the built-in compact toggle. Defaults to true. */
  showCompactToggle?: boolean;
  /** Accessible name for the navigation landmark. */
  label?: string;
}

/**
 * Translucent navigation panel. Compose with `SidebarSection` and `SidebarItem`.
 * Uses the subtle glass material — one blurred surface for the entire nav.
 */
export const AeroSidebar = forwardRef<HTMLElement, AeroSidebarProps>(function AeroSidebar(
  {
    header,
    footer,
    compact: compactProp,
    defaultCompact = false,
    onCompactChange,
    showCompactToggle = true,
    label = "Main navigation",
    className,
    children,
    ...props
  },
  ref,
) {
  const [compact, setCompact] = useControllableState(compactProp, defaultCompact, onCompactChange);
  return (
    <SidebarContext.Provider value={{ compact }}>
      <nav
        ref={ref}
        aria-label={label}
        data-orbit-chrome=""
        data-compact={compact || undefined}
        className={cn("orb-sidebar orb-material-subtle", className)}
        {...props}
      >
        {header && <div className="orb-sidebar__header">{header}</div>}
        <div className="orb-sidebar__body">{children}</div>
        {(footer || showCompactToggle) && (
          <ul className="orb-sidebar__footer orb-sidebar__list">
            {footer}
            {showCompactToggle && (
              <SidebarItem
                as="button"
                icon={compact ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
                aria-expanded={!compact}
                onClick={() => setCompact(!compact)}
              >
                {compact ? "Expand sidebar" : "Collapse sidebar"}
              </SidebarItem>
            )}
          </ul>
        )}
      </nav>
    </SidebarContext.Provider>
  );
});

/* ========================================================= SidebarSection */

export interface SidebarSectionProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title?: ReactNode;
  collapsible?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Trailing action in the section header (e.g. "+" to add a project). */
  action?: ReactNode;
}

export function SidebarSection({
  title,
  collapsible = false,
  open: openProp,
  defaultOpen = true,
  onOpenChange,
  action,
  className,
  children,
  ...props
}: SidebarSectionProps) {
  const { compact } = useSidebar();
  const [open, setOpen] = useControllableState(openProp, defaultOpen, onOpenChange);
  const id = useId();
  const expanded = compact || !collapsible || open;
  return (
    <div className={cn("orb-sidebar__section", className)} {...props}>
      {title && !compact && (
        <div className="orb-sidebar__section-header">
          {collapsible ? (
            <button
              type="button"
              className="orb-sidebar__section-title orb-sidebar__section-toggle"
              aria-expanded={open}
              aria-controls={id}
              onClick={() => setOpen(!open)}
            >
              <ChevronDown
                size={14}
                aria-hidden
                className="orb-sidebar__chevron"
                data-open={open || undefined}
              />
              {title}
            </button>
          ) : (
            <h2 className="orb-sidebar__section-title">{title}</h2>
          )}
          {action}
        </div>
      )}
      {compact && title && <div className="orb-sidebar__divider" role="separator" />}
      <ul id={id} className="orb-sidebar__list" hidden={!expanded}>
        {children}
      </ul>
    </div>
  );
}

/* ============================================================ SidebarItem */

type SidebarItemBase = {
  icon?: ReactNode;
  /** Trailing count/badge. */
  badge?: ReactNode;
  active?: boolean;
  children: ReactNode;
  className?: string;
};

export type SidebarItemProps = SidebarItemBase &
  (
    | ({ as?: "a" } & AnchorHTMLAttributes<HTMLAnchorElement>)
    | ({ as: "button" } & HTMLAttributes<HTMLButtonElement>)
  );

/**
 * Navigation entry. Renders `<a>` by default (pass `href`, and `onClick` for client-side
 * routing) or a `<button>` with `as="button"` for actions.
 */
export function SidebarItem(props: SidebarItemProps) {
  const { compact } = useSidebar();
  const {
    icon,
    badge,
    active,
    children,
    className,
    as = "a",
    ...rest
  } = props as SidebarItemBase & {
    as?: string;
  } & Record<string, unknown>;
  const cls = cn("orb-sidebar__item", active && "orb-sidebar__item--active", className);
  const inner = (
    <>
      {icon && (
        <span className="orb-sidebar__icon" aria-hidden>
          {icon}
        </span>
      )}
      <span className={cn("orb-sidebar__label", compact && "orb-sr-only")}>{children}</span>
      {badge != null && !compact && <span className="orb-sidebar__badge">{badge}</span>}
    </>
  );
  let el: ReactNode;
  if (as === "button") {
    el = (
      <button type="button" className={cls} aria-current={active ? "page" : undefined} {...rest}>
        {inner}
      </button>
    );
  } else {
    el = (
      <a className={cls} aria-current={active ? "page" : undefined} {...rest}>
        {inner}
      </a>
    );
  }
  return (
    <li className="orb-sidebar__li">
      {compact ? (
        <Tooltip content={children} side="right">
          {el}
        </Tooltip>
      ) : (
        el
      )}
    </li>
  );
}
