import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "../../utils/cn";
import { Spinner } from "./Feedback";
import { Tooltip } from "./Overlays";

export const buttonVariants = cva("orb-button", {
  variants: {
    variant: {
      /** Solid accent. Use for the single most important action in a region. */
      primary: "orb-button--primary",
      /** Luminous Aero gradient — signature primary action (see `AeroButton`). */
      aero: "orb-button--aero",
      /** Neutral bordered button for secondary actions. */
      secondary: "orb-button--secondary",
      /** Tinted accent without a border. */
      soft: "orb-button--soft",
      /** No chrome until hovered. Toolbars and dense rows. */
      ghost: "orb-button--ghost",
      /** Destructive actions. */
      danger: "orb-button--danger",
    },
    size: {
      sm: "orb-button--sm",
      md: "orb-button--md",
      lg: "orb-button--lg",
    },
    fullWidth: { true: "orb-button--block" },
  },
  defaultVariants: { variant: "secondary", size: "md" },
});

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  /** Render the child element instead of a `<button>` (e.g. a router link). */
  asChild?: boolean;
  /** Shows a spinner, sets `aria-busy` and blocks interaction. */
  loading?: boolean;
  /** Text announced while loading. Defaults to the button content. */
  loadingLabel?: string;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant,
    size,
    fullWidth,
    asChild = false,
    loading = false,
    loadingLabel,
    leadingIcon,
    trailingIcon,
    disabled,
    children,
    type,
    ...props
  },
  ref,
) {
  const Comp = asChild ? Slot.Root : "button";
  const content = asChild ? (
    children
  ) : (
    <>
      {loading ? <Spinner size="sm" label={loadingLabel} /> : leadingIcon}
      {children != null && <span className="orb-button__label">{children}</span>}
      {!loading && trailingIcon}
    </>
  );
  return (
    <Comp
      ref={ref}
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      disabled={asChild ? undefined : disabled || loading}
      aria-disabled={asChild && disabled ? true : undefined}
      aria-busy={loading || undefined}
      data-loading={loading || undefined}
      type={asChild ? undefined : (type ?? "button")}
      {...props}
    >
      {content}
    </Comp>
  );
});

/** The signature Orbit primary action: luminous aqua-blue gradient with a glass sheen. */
export const AeroButton = forwardRef<HTMLButtonElement, Omit<ButtonProps, "variant">>(
  function AeroButton(props, ref) {
    return <Button ref={ref} variant="aero" {...props} />;
  },
);

export interface IconButtonProps
  extends
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label">,
    Pick<VariantProps<typeof buttonVariants>, "variant" | "size"> {
  /** Accessible name. Also used as the tooltip text. Required. */
  label: string;
  icon: ReactNode;
  /** Show the label in a tooltip on hover/focus. Defaults to `true`. */
  tooltip?: boolean;
  loading?: boolean;
}

/** Square icon-only button. Always has an accessible name. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    label,
    icon,
    tooltip = true,
    variant = "ghost",
    size = "md",
    className,
    loading,
    disabled,
    type,
    ...props
  },
  ref,
) {
  const button = (
    <button
      ref={ref}
      type={type ?? "button"}
      aria-label={label}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={cn(buttonVariants({ variant, size }), "orb-button--icon", className)}
      {...props}
    >
      {loading ? <Spinner size="sm" /> : icon}
    </button>
  );
  return tooltip ? <Tooltip content={label}>{button}</Tooltip> : button;
});
