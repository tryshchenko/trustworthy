import { X } from "@orbit/icons";
import { Dialog as RD, DropdownMenu as RM, Popover as RP, Tooltip as RT } from "radix-ui";
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { usePortalContainer } from "../../theme/ThemeProvider";
import { cn } from "../../utils/cn";

/* ================================================================ Tooltip */

export interface TooltipProps {
  /** Tooltip text. Supplementary only — never put essential information here. */
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  delayDuration?: number;
  /** Disable the tooltip without changing the tree. */
  disabled?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Tooltip({
  content,
  children,
  side = "top",
  align = "center",
  delayDuration = 350,
  disabled,
  ...rootProps
}: TooltipProps) {
  const container = usePortalContainer();
  if (disabled || content == null || content === "") return <>{children}</>;
  return (
    <RT.Provider delayDuration={delayDuration} skipDelayDuration={250}>
      <RT.Root {...rootProps}>
        <RT.Trigger asChild>{children}</RT.Trigger>
        <RT.Portal container={container}>
          <RT.Content
            side={side}
            align={align}
            sideOffset={6}
            collisionPadding={8}
            className="orb-tooltip"
          >
            {content}
          </RT.Content>
        </RT.Portal>
      </RT.Root>
    </RT.Provider>
  );
}

/* ================================================================ Popover */

export const Popover = RP.Root;
export const PopoverTrigger = RP.Trigger;
export const PopoverAnchor = RP.Anchor;
export const PopoverClose = RP.Close;

export interface PopoverContentProps extends ComponentPropsWithoutRef<typeof RP.Content> {
  /** Visual material. `glass` uses the raised glass material; `solid` is opaque. */
  material?: "glass" | "solid";
  padding?: "none" | "sm" | "md";
}

export const PopoverContent = forwardRef<ElementRef<typeof RP.Content>, PopoverContentProps>(
  function PopoverContent(
    {
      className,
      material = "glass",
      padding = "md",
      sideOffset = 6,
      collisionPadding = 8,
      align = "start",
      ...props
    },
    ref,
  ) {
    const container = usePortalContainer();
    return (
      <RP.Portal container={container}>
        <RP.Content
          ref={ref}
          sideOffset={sideOffset}
          collisionPadding={collisionPadding}
          align={align}
          className={cn("orb-popover", `orb-popover--${material}`, `orb-pad-${padding}`, className)}
          {...props}
        />
      </RP.Portal>
    );
  },
);

/* =========================================================== DropdownMenu */

/**
 * Menu root. Defaults to `modal={false}`: menus close on outside interaction anyway,
 * and skipping the scroll lock avoids a full-page relayout on every open (INP).
 */
export function DropdownMenu({
  modal = false,
  ...props
}: ComponentPropsWithoutRef<typeof RM.Root>) {
  return <RM.Root modal={modal} {...props} />;
}
export const DropdownMenuTrigger = RM.Trigger;
export const DropdownMenuGroup = RM.Group;
export const DropdownMenuRadioGroup = RM.RadioGroup;
export const DropdownMenuSub = RM.Sub;

export const DropdownMenuContent = forwardRef<
  ElementRef<typeof RM.Content>,
  ComponentPropsWithoutRef<typeof RM.Content>
>(function DropdownMenuContent(
  { className, sideOffset = 6, align = "start", collisionPadding = 8, ...props },
  ref,
) {
  const container = usePortalContainer();
  return (
    <RM.Portal container={container}>
      <RM.Content
        ref={ref}
        sideOffset={sideOffset}
        align={align}
        collisionPadding={collisionPadding}
        className={cn("orb-menu", className)}
        {...props}
      />
    </RM.Portal>
  );
});

export interface DropdownMenuItemProps extends ComponentPropsWithoutRef<typeof RM.Item> {
  icon?: ReactNode;
  /** Keyboard shortcut hint, e.g. "⌘K". Visual only. */
  shortcut?: string;
  tone?: "default" | "danger";
}

export const DropdownMenuItem = forwardRef<ElementRef<typeof RM.Item>, DropdownMenuItemProps>(
  function DropdownMenuItem(
    { className, icon, shortcut, tone = "default", children, ...props },
    ref,
  ) {
    return (
      <RM.Item
        ref={ref}
        className={cn("orb-menu__item", tone === "danger" && "orb-menu__item--danger", className)}
        {...props}
      >
        {icon && (
          <span className="orb-menu__icon" aria-hidden>
            {icon}
          </span>
        )}
        <span className="orb-menu__text">{children}</span>
        {shortcut && (
          <span className="orb-menu__shortcut" aria-hidden>
            {shortcut}
          </span>
        )}
      </RM.Item>
    );
  },
);

export const DropdownMenuCheckboxItem = forwardRef<
  ElementRef<typeof RM.CheckboxItem>,
  ComponentPropsWithoutRef<typeof RM.CheckboxItem>
>(function DropdownMenuCheckboxItem({ className, children, ...props }, ref) {
  return (
    <RM.CheckboxItem
      ref={ref}
      className={cn("orb-menu__item orb-menu__item--check", className)}
      {...props}
    >
      <span className="orb-menu__indicator" aria-hidden>
        <RM.ItemIndicator>
          <CheckMark />
        </RM.ItemIndicator>
      </span>
      <span className="orb-menu__text">{children}</span>
    </RM.CheckboxItem>
  );
});

export const DropdownMenuRadioItem = forwardRef<
  ElementRef<typeof RM.RadioItem>,
  ComponentPropsWithoutRef<typeof RM.RadioItem>
>(function DropdownMenuRadioItem({ className, children, ...props }, ref) {
  return (
    <RM.RadioItem
      ref={ref}
      className={cn("orb-menu__item orb-menu__item--check", className)}
      {...props}
    >
      <span className="orb-menu__indicator" aria-hidden>
        <RM.ItemIndicator>
          <span className="orb-menu__dot" />
        </RM.ItemIndicator>
      </span>
      <span className="orb-menu__text">{children}</span>
    </RM.RadioItem>
  );
});

export const DropdownMenuLabel = forwardRef<
  ElementRef<typeof RM.Label>,
  ComponentPropsWithoutRef<typeof RM.Label>
>(function DropdownMenuLabel({ className, ...props }, ref) {
  return <RM.Label ref={ref} className={cn("orb-menu__label", className)} {...props} />;
});

export const DropdownMenuSeparator = forwardRef<
  ElementRef<typeof RM.Separator>,
  ComponentPropsWithoutRef<typeof RM.Separator>
>(function DropdownMenuSeparator({ className, ...props }, ref) {
  return <RM.Separator ref={ref} className={cn("orb-menu__separator", className)} {...props} />;
});

export const DropdownMenuSubTrigger = forwardRef<
  ElementRef<typeof RM.SubTrigger>,
  ComponentPropsWithoutRef<typeof RM.SubTrigger> & { icon?: ReactNode }
>(function DropdownMenuSubTrigger({ className, icon, children, ...props }, ref) {
  return (
    <RM.SubTrigger
      ref={ref}
      className={cn("orb-menu__item orb-menu__item--sub", className)}
      {...props}
    >
      {icon && (
        <span className="orb-menu__icon" aria-hidden>
          {icon}
        </span>
      )}
      <span className="orb-menu__text">{children}</span>
      <span className="orb-menu__chevron" aria-hidden>
        ›
      </span>
    </RM.SubTrigger>
  );
});

export const DropdownMenuSubContent = forwardRef<
  ElementRef<typeof RM.SubContent>,
  ComponentPropsWithoutRef<typeof RM.SubContent>
>(function DropdownMenuSubContent({ className, ...props }, ref) {
  const container = usePortalContainer();
  return (
    <RM.Portal container={container}>
      <RM.SubContent ref={ref} sideOffset={4} className={cn("orb-menu", className)} {...props} />
    </RM.Portal>
  );
});

function CheckMark() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M2.5 6.2 5 8.6l4.5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ================================================================= Dialog */

export const Dialog = RD.Root;
export const DialogTrigger = RD.Trigger;
export const DialogClose = RD.Close;

export interface DialogContentProps extends ComponentPropsWithoutRef<typeof RD.Content> {
  size?: "sm" | "md" | "lg";
  /** Hide the built-in close button. */
  hideClose?: boolean;
}

export const DialogContent = forwardRef<ElementRef<typeof RD.Content>, DialogContentProps>(
  function DialogContent({ className, size = "md", hideClose, children, ...props }, ref) {
    const container = usePortalContainer();
    return (
      <RD.Portal container={container}>
        <RD.Overlay className="orb-overlay" />
        <RD.Content
          ref={ref}
          className={cn("orb-dialog", `orb-dialog--${size}`, className)}
          {...props}
        >
          {children}
          {!hideClose && (
            <RD.Close
              className="orb-button orb-button--ghost orb-button--sm orb-button--icon orb-dialog__close"
              aria-label="Close"
            >
              <X size={16} aria-hidden />
            </RD.Close>
          )}
        </RD.Content>
      </RD.Portal>
    );
  },
);

export function DialogHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("orb-dialog__header", className)} {...props} />;
}
export function DialogBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("orb-dialog__body", className)} {...props} />;
}
export function DialogFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("orb-dialog__footer", className)} {...props} />;
}
export const DialogTitle = forwardRef<
  ElementRef<typeof RD.Title>,
  ComponentPropsWithoutRef<typeof RD.Title>
>(function DialogTitle({ className, ...props }, ref) {
  return <RD.Title ref={ref} className={cn("orb-dialog__title", className)} {...props} />;
});
export const DialogDescription = forwardRef<
  ElementRef<typeof RD.Description>,
  ComponentPropsWithoutRef<typeof RD.Description>
>(function DialogDescription({ className, ...props }, ref) {
  return (
    <RD.Description ref={ref} className={cn("orb-dialog__description", className)} {...props} />
  );
});

/* ================================================================= Drawer */

export const Drawer = RD.Root;
export const DrawerTrigger = RD.Trigger;
export const DrawerClose = RD.Close;
export const DrawerTitle = DialogTitle;
export const DrawerDescription = DialogDescription;

export interface DrawerContentProps extends ComponentPropsWithoutRef<typeof RD.Content> {
  side?: "left" | "right" | "bottom";
  size?: "sm" | "md" | "lg";
  /** Render a dimming scrim behind the drawer. Defaults to true. */
  overlay?: boolean;
}

/** Edge-anchored modal panel, built on the Dialog primitive (focus trap, Esc, scroll lock). */
export const DrawerContent = forwardRef<ElementRef<typeof RD.Content>, DrawerContentProps>(
  function DrawerContent(
    { className, side = "right", size = "md", overlay = true, ...props },
    ref,
  ) {
    const container = usePortalContainer();
    return (
      <RD.Portal container={container}>
        {overlay && <RD.Overlay className="orb-overlay" />}
        <RD.Content
          ref={ref}
          className={cn("orb-drawer", `orb-drawer--${side}`, `orb-drawer--${size}`, className)}
          {...props}
        />
      </RD.Portal>
    );
  },
);
