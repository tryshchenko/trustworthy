import { Menu, Search } from "@orbit/icons";
import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "../../utils/cn";
import { IconButton } from "../foundation/Button";
import { Kbd } from "../foundation/Feedback";

export interface AeroHeaderProps extends HTMLAttributes<HTMLElement> {
  /** Brand mark / product name. */
  logo?: ReactNode;
  /** Centre slot, typically `<HeaderSearch />`. */
  search?: ReactNode;
  /** Primary navigation links next to the logo. */
  nav?: ReactNode;
  /** Right-aligned actions: create button, notifications, profile menu. */
  actions?: ReactNode;
  /** When provided, renders a menu button (visible on small screens) that opens the sidebar drawer. */
  onMenuClick?: () => void;
  menuLabel?: string;
}

/** Translucent global header (`role="banner"` landmark). */
export const AeroHeader = forwardRef<HTMLElement, AeroHeaderProps>(function AeroHeader(
  { logo, search, nav, actions, onMenuClick, menuLabel = "Open navigation", className, ...props },
  ref,
) {
  return (
    <header
      ref={ref}
      data-orbit-chrome=""
      className={cn("orb-header orb-material-standard", className)}
      {...props}
    >
      <div className="orb-header__start">
        {onMenuClick && (
          <IconButton
            className="orb-header__menu"
            label={menuLabel}
            icon={<Menu size={18} />}
            onClick={onMenuClick}
            tooltip={false}
          />
        )}
        {logo && <div className="orb-header__logo">{logo}</div>}
        {nav && <div className="orb-header__nav">{nav}</div>}
      </div>
      {search && <div className="orb-header__search">{search}</div>}
      {actions && <div className="orb-header__actions">{actions}</div>}
    </header>
  );
});

export interface HeaderSearchProps extends Omit<HTMLAttributes<HTMLButtonElement>, "children"> {
  placeholder?: string;
  /** Shortcut hint shown at the end, e.g. "⌘K". */
  shortcut?: string;
}

/**
 * Search affordance that opens a command palette. Rendered as a button (not a
 * text field) because activation opens a dialog with the real input.
 */
export const HeaderSearch = forwardRef<HTMLButtonElement, HeaderSearchProps>(function HeaderSearch(
  { placeholder = "Search issues, projects, people…", shortcut = "⌘K", className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn("orb-header-search", className)}
      aria-keyshortcuts={shortcut === "⌘K" ? "Meta+K Control+K" : undefined}
      {...props}
    >
      <Search size={16} aria-hidden />
      <span className="orb-header-search__text">{placeholder}</span>
      {shortcut && <Kbd aria-hidden>{shortcut}</Kbd>}
    </button>
  );
});
