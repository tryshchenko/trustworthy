import { Dialog as RD } from "radix-ui";
import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { usePortalContainer } from "../../theme/ThemeProvider";
import { cn } from "../../utils/cn";
import { useControllableState } from "../../utils/use-controllable-state";
import { useMediaQuery } from "../../utils/use-media-query";

export interface AppShellProps extends HTMLAttributes<HTMLDivElement> {
  /** Usually an `<AeroSidebar>`. Becomes an off-canvas drawer below `drawerBelow`. */
  sidebar?: ReactNode;
  /** Usually an `<AeroHeader>`. */
  header?: ReactNode;
  /** Usually an `<AeroBackground>`. */
  background?: ReactNode;
  /** Docked panel next to the main content (e.g. `<FloatingInspector>`). */
  aside?: ReactNode;
  /** Mobile drawer state. */
  sidebarOpen?: boolean;
  onSidebarOpenChange?: (open: boolean) => void;
  /** Viewport width (px) below which the sidebar becomes a drawer. Default 1024. */
  drawerBelow?: number;
  /** id for the main landmark (target of a skip link). */
  mainId?: string;
}

/**
 * Full-height application frame: background → sidebar → header → main (+ aside).
 * Includes a "Skip to content" link and responsive sidebar drawer.
 */
export const AppShell = forwardRef<HTMLDivElement, AppShellProps>(function AppShell(
  {
    sidebar,
    header,
    background,
    aside,
    sidebarOpen,
    onSidebarOpenChange,
    drawerBelow = 1024,
    mainId = "orb-main",
    className,
    children,
    ...props
  },
  ref,
) {
  const isNarrow = useMediaQuery(`(max-width: ${drawerBelow - 1}px)`);
  const [open, setOpen] = useControllableState(sidebarOpen, false, onSidebarOpenChange);
  const container = usePortalContainer();
  return (
    <div ref={ref} className={cn("orb-shell", className)} {...props}>
      <a className="orb-skip-link" href={`#${mainId}`}>
        Skip to content
      </a>
      {background}
      {sidebar && !isNarrow && <div className="orb-shell__sidebar">{sidebar}</div>}
      {sidebar && isNarrow && (
        <RD.Root open={open} onOpenChange={setOpen}>
          <RD.Portal container={container}>
            <RD.Overlay className="orb-overlay" />
            <RD.Content className="orb-shell__drawer" aria-describedby={undefined}>
              <RD.Title className="orb-sr-only">Navigation</RD.Title>
              {/* Close the drawer after navigating (delegated: links/buttons inside are natively keyboard-operable). */}
              {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
              <div
                className="orb-shell__drawer-inner"
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest("a[href], [data-close-drawer]"))
                    setOpen(false);
                }}
              >
                {sidebar}
              </div>
            </RD.Content>
          </RD.Portal>
        </RD.Root>
      )}
      <div className="orb-shell__column">
        {header}
        <div className="orb-shell__content">
          <main id={mainId} tabIndex={-1} className="orb-shell__main">
            {children}
          </main>
          {aside}
        </div>
      </div>
    </div>
  );
});
