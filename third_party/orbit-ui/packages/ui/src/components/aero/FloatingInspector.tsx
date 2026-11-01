import { X } from "@orbit/icons";
import { Dialog as RD } from "radix-ui";
import { forwardRef, useEffect, useId, useRef, type HTMLAttributes, type ReactNode } from "react";
import { usePortalContainer } from "../../theme/ThemeProvider";
import { cn } from "../../utils/cn";
import { useMediaQuery } from "../../utils/use-media-query";
import { IconButton } from "../foundation/Button";

export interface FloatingInspectorProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Accessible name / visible title of the inspector. */
  title: ReactNode;
  /** Small text above the title (e.g. an issue key). */
  eyebrow?: ReactNode;
  /** Header actions next to the close button. */
  actions?: ReactNode;
  footer?: ReactNode;
  /** Width when docked. Defaults to 440px. */
  width?: number;
  /**
   * - `docked` (default): non-modal panel beside the content so the board stays usable.
   * - `modal`: always a full-screen dialog.
   * Below `modalBelow` px the inspector always becomes a full-screen dialog.
   */
  mode?: "docked" | "modal";
  modalBelow?: number;
  /** Return focus here on close. Defaults to the element focused at open time. */
  returnFocusRef?: React.RefObject<HTMLElement | null>;
}

/**
 * Detail/editing panel. On desktop it docks beside the main content as a raised
 * glass panel (`role="complementary"`) without trapping focus; on small screens it
 * becomes a modal full-screen dialog with focus management.
 */
export const FloatingInspector = forwardRef<HTMLElement, FloatingInspectorProps>(
  function FloatingInspector(
    {
      open,
      onOpenChange,
      title,
      eyebrow,
      actions,
      footer,
      width = 440,
      mode = "docked",
      modalBelow = 768,
      returnFocusRef,
      className,
      children,
      style,
      ...props
    },
    ref,
  ) {
    const small = useMediaQuery(`(max-width: ${modalBelow - 1}px)`);
    const asModal = mode === "modal" || small;
    const container = usePortalContainer();
    const titleId = useId();
    const panelRef = useRef<HTMLElement | null>(null);
    const previouslyFocused = useRef<HTMLElement | null>(null);

    // Docked mode: move focus in on open and restore it on close (no trap — content stays reachable).
    useEffect(() => {
      if (asModal) return;
      if (open) {
        previouslyFocused.current = document.activeElement as HTMLElement | null;
        requestAnimationFrame(() => panelRef.current?.focus({ preventScroll: true }));
      } else {
        const target = returnFocusRef?.current ?? previouslyFocused.current;
        if (target && document.contains(target)) target.focus({ preventScroll: true });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, asModal]);

    const header = (TitleTag: React.ElementType) => (
      <div className="orb-inspector__header">
        <div className="orb-inspector__titles">
          {eyebrow && <div className="orb-inspector__eyebrow">{eyebrow}</div>}
          <TitleTag id={titleId} className="orb-inspector__title">
            {title}
          </TitleTag>
        </div>
        <div className="orb-inspector__actions">
          {actions}
          <IconButton
            label="Close inspector"
            icon={<X size={18} />}
            onClick={() => onOpenChange(false)}
            tooltip={false}
          />
        </div>
      </div>
    );
    const body = (
      <>
        <div className="orb-inspector__body">{children}</div>
        {footer && <div className="orb-inspector__footer">{footer}</div>}
      </>
    );

    if (asModal) {
      return (
        <RD.Root open={open} onOpenChange={onOpenChange}>
          <RD.Portal container={container}>
            <RD.Overlay className="orb-overlay" />
            <RD.Content
              className={cn("orb-inspector orb-inspector--modal orb-material-raised", className)}
              aria-labelledby={titleId}
              aria-describedby={undefined}
              // Focus the panel itself (not the first button) so screen readers start at the title.
              onOpenAutoFocus={(e) => {
                e.preventDefault();
                (e.currentTarget as HTMLElement | null)?.focus();
              }}
            >
              {header(RD.Title)}
              {body}
            </RD.Content>
          </RD.Portal>
        </RD.Root>
      );
    }

    if (!open) return null;
    return (
      // Escape is handled for the whole non-modal panel (delegated from its focusable children).
      // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
      <aside
        ref={(el) => {
          panelRef.current = el;
          if (typeof ref === "function") ref(el);
          else if (ref) ref.current = el;
        }}
        tabIndex={-1}
        aria-labelledby={titleId}
        className={cn("orb-inspector orb-inspector--docked orb-material-raised", className)}
        style={{ ["--orb-inspector-width" as string]: `${width}px`, ...style }}
        onKeyDown={(e) => {
          if (e.key === "Escape" && !e.defaultPrevented) {
            e.stopPropagation();
            onOpenChange(false);
          }
        }}
        {...props}
      >
        {header("h2")}
        {body}
      </aside>
    );
  },
);
