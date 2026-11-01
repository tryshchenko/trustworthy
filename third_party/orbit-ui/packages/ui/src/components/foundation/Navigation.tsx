import { ScrollArea as RSA, Tabs as RTabs } from "radix-ui";
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef, type ReactNode } from "react";
import { cn } from "../../utils/cn";

/* ==================================================================== Tabs */

export const Tabs = forwardRef<
  ElementRef<typeof RTabs.Root>,
  ComponentPropsWithoutRef<typeof RTabs.Root>
>(function Tabs({ className, ...props }, ref) {
  return <RTabs.Root ref={ref} className={cn("orb-tabs", className)} {...props} />;
});

export interface TabsListProps extends ComponentPropsWithoutRef<typeof RTabs.List> {
  /** `underline` for page-level navigation, `pill` for segmented controls. */
  variant?: "underline" | "pill";
}

export const TabsList = forwardRef<ElementRef<typeof RTabs.List>, TabsListProps>(function TabsList(
  { className, variant = "underline", ...props },
  ref,
) {
  return (
    <RTabs.List
      ref={ref}
      className={cn("orb-tabs__list", `orb-tabs__list--${variant}`, className)}
      {...props}
    />
  );
});

export interface TabsTriggerProps extends ComponentPropsWithoutRef<typeof RTabs.Trigger> {
  icon?: ReactNode;
  /** Count or badge shown after the label. */
  count?: ReactNode;
}

export const TabsTrigger = forwardRef<ElementRef<typeof RTabs.Trigger>, TabsTriggerProps>(
  function TabsTrigger({ className, icon, count, children, ...props }, ref) {
    return (
      <RTabs.Trigger ref={ref} className={cn("orb-tabs__trigger", className)} {...props}>
        {icon && (
          <span className="orb-tabs__icon" aria-hidden>
            {icon}
          </span>
        )}
        <span>{children}</span>
        {count != null && <span className="orb-tabs__count">{count}</span>}
      </RTabs.Trigger>
    );
  },
);

export const TabsContent = forwardRef<
  ElementRef<typeof RTabs.Content>,
  ComponentPropsWithoutRef<typeof RTabs.Content>
>(function TabsContent({ className, ...props }, ref) {
  return <RTabs.Content ref={ref} className={cn("orb-tabs__content", className)} {...props} />;
});

/* ============================================================== ScrollArea */

export interface ScrollAreaProps extends ComponentPropsWithoutRef<typeof RSA.Root> {
  orientation?: "vertical" | "horizontal" | "both";
  viewportClassName?: string;
  /** Props forwarded to the scrolling viewport (e.g. aria-label, tabIndex). */
  viewportProps?: ComponentPropsWithoutRef<typeof RSA.Viewport>;
}

/** Cross-browser styled scroll container with thin overlay scrollbars. */
export const ScrollArea = forwardRef<ElementRef<typeof RSA.Viewport>, ScrollAreaProps>(
  function ScrollArea(
    { className, orientation = "vertical", viewportClassName, viewportProps, children, ...props },
    ref,
  ) {
    return (
      <RSA.Root className={cn("orb-scroll", className)} type="hover" {...props}>
        <RSA.Viewport
          ref={ref}
          className={cn("orb-scroll__viewport", viewportClassName)}
          {...viewportProps}
        >
          {children}
        </RSA.Viewport>
        {orientation !== "horizontal" && (
          <RSA.Scrollbar orientation="vertical" className="orb-scroll__bar">
            <RSA.Thumb className="orb-scroll__thumb" />
          </RSA.Scrollbar>
        )}
        {orientation !== "vertical" && (
          <RSA.Scrollbar orientation="horizontal" className="orb-scroll__bar">
            <RSA.Thumb className="orb-scroll__thumb" />
          </RSA.Scrollbar>
        )}
        <RSA.Corner />
      </RSA.Root>
    );
  },
);
