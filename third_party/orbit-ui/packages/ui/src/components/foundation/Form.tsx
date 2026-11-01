import { Check, ChevronDown, Minus } from "@orbit/icons";
import {
  Checkbox as RC,
  Label as RL,
  RadioGroup as RR,
  Select as RS,
  Switch as RSw,
} from "radix-ui";
import {
  createContext,
  forwardRef,
  useContext,
  useId,
  type ComponentPropsWithoutRef,
  type ElementRef,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { usePortalContainer } from "../../theme/ThemeProvider";
import { cn } from "../../utils/cn";

/* =================================================================== Field */

interface FieldContextValue {
  id: string;
  descriptionId?: string;
  errorId?: string;
  invalid: boolean;
  required: boolean;
  disabled: boolean;
}
const FieldContext = createContext<FieldContextValue | null>(null);

/** Read ARIA wiring from the nearest `<Field>`. Use it to build custom field controls. */
export function useFieldControl(props: {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false" | "grammar" | "spelling";
  required?: boolean;
  disabled?: boolean;
}) {
  const field = useContext(FieldContext);
  const describedBy = [
    props["aria-describedby"],
    field?.descriptionId,
    field?.invalid ? field.errorId : undefined,
  ]
    .filter(Boolean)
    .join(" ");
  const invalid = props["aria-invalid"] ?? (field?.invalid || undefined);
  return {
    id: props.id ?? field?.id,
    "aria-describedby": describedBy || undefined,
    "aria-invalid": invalid,
    required: props.required ?? (field?.required || undefined),
    disabled: props.disabled ?? (field?.disabled || undefined),
  };
}

export interface FieldProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  label: ReactNode;
  /** Help text shown below the control and linked via `aria-describedby`. */
  description?: ReactNode;
  /** Validation message. When present the control is marked `aria-invalid`. */
  error?: ReactNode;
  required?: boolean;
  disabled?: boolean;
  /** Visually hide the label (it remains available to assistive tech). */
  hideLabel?: boolean;
  /** Override the generated control id. */
  controlId?: string;
  children: ReactNode;
}

/**
 * Labels a form control and wires up description / error messaging. Orbit
 * inputs inside a Field pick up `id`, `aria-describedby` and `aria-invalid`.
 */
export function Field({
  label,
  description,
  error,
  required = false,
  disabled = false,
  hideLabel,
  controlId,
  className,
  children,
  ...props
}: FieldProps) {
  const generated = useId();
  const id = controlId ?? `orb-field-${generated}`;
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = `${id}-error`;
  const invalid = Boolean(error);
  return (
    <FieldContext.Provider value={{ id, descriptionId, errorId, invalid, required, disabled }}>
      <div className={cn("orb-field", disabled && "orb-field--disabled", className)} {...props}>
        <Label htmlFor={id} className={cn(hideLabel && "orb-sr-only")}>
          {label}
          {required && (
            <span className="orb-field__required" aria-hidden>
              *
            </span>
          )}
        </Label>
        {children}
        {description && (
          <p id={descriptionId} className="orb-field__description">
            {description}
          </p>
        )}
        <p
          id={errorId}
          className="orb-field__error"
          role={invalid ? "alert" : undefined}
          hidden={!invalid}
        >
          {error}
        </p>
      </div>
    </FieldContext.Provider>
  );
}

export const Label = forwardRef<
  ElementRef<typeof RL.Root>,
  ComponentPropsWithoutRef<typeof RL.Root>
>(function Label({ className, ...props }, ref) {
  return <RL.Root ref={ref} className={cn("orb-label", className)} {...props} />;
});

/* =================================================================== Input */

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  size?: "sm" | "md" | "lg";
  /** Icon or text rendered inside the start of the field. */
  leading?: ReactNode;
  /** Icon, button or text rendered inside the end of the field. */
  trailing?: ReactNode;
  invalid?: boolean;
  /** Use the translucent glass treatment (e.g. global search in a header). */
  glass?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, size = "md", leading, trailing, invalid, glass, style, ...props },
  ref,
) {
  const a11y = useFieldControl({
    ...props,
    "aria-invalid": invalid || props["aria-invalid"] || undefined,
  });
  return (
    <div
      className={cn(
        "orb-input",
        `orb-input--${size}`,
        glass && "orb-input--glass",
        a11y["aria-invalid"] && "orb-input--invalid",
        a11y.disabled && "orb-input--disabled",
        className,
      )}
      style={style}
    >
      {leading && (
        <span className="orb-input__adornment" aria-hidden>
          {leading}
        </span>
      )}
      <input ref={ref} className="orb-input__control" {...props} {...a11y} />
      {trailing && (
        <span className="orb-input__adornment orb-input__adornment--end">{trailing}</span>
      )}
    </div>
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
  /** Grow with content up to `maxRows`. Uses CSS `field-sizing` where supported. */
  autoResize?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid, autoResize = true, rows = 3, ...props },
  ref,
) {
  const a11y = useFieldControl({
    ...props,
    "aria-invalid": invalid || props["aria-invalid"] || undefined,
  });
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        "orb-textarea",
        autoResize && "orb-textarea--auto",
        a11y["aria-invalid"] && "orb-input--invalid",
        className,
      )}
      {...props}
      {...a11y}
    />
  );
});

/* ================================================================ Checkbox */

export interface CheckboxProps extends ComponentPropsWithoutRef<typeof RC.Root> {
  /** Inline label. Omit when labelled externally (e.g. by a Field or aria-label). */
  label?: ReactNode;
  description?: ReactNode;
}

export const Checkbox = forwardRef<ElementRef<typeof RC.Root>, CheckboxProps>(function Checkbox(
  { className, label, description, id, ...props },
  ref,
) {
  const generated = useId();
  const controlId = id ?? `orb-cb-${generated}`;
  const box = (
    <RC.Root
      ref={ref}
      id={controlId}
      className={cn("orb-checkbox", !label && className)}
      {...props}
    >
      <RC.Indicator className="orb-checkbox__indicator">
        {props.checked === "indeterminate" ? (
          <Minus size={12} strokeWidth={3} />
        ) : (
          <Check size={12} strokeWidth={3} />
        )}
      </RC.Indicator>
    </RC.Root>
  );
  if (!label) return box;
  return (
    <div className={cn("orb-choice", className)}>
      {box}
      <div className="orb-choice__text">
        <label htmlFor={controlId} className="orb-choice__label">
          {label}
        </label>
        {description && <span className="orb-choice__description">{description}</span>}
      </div>
    </div>
  );
});

/* =================================================================== Radio */

export const RadioGroup = forwardRef<
  ElementRef<typeof RR.Root>,
  ComponentPropsWithoutRef<typeof RR.Root>
>(function RadioGroup({ className, ...props }, ref) {
  return <RR.Root ref={ref} className={cn("orb-radio-group", className)} {...props} />;
});

export interface RadioProps extends ComponentPropsWithoutRef<typeof RR.Item> {
  label: ReactNode;
  description?: ReactNode;
}

export const Radio = forwardRef<ElementRef<typeof RR.Item>, RadioProps>(function Radio(
  { className, label, description, id, ...props },
  ref,
) {
  const generated = useId();
  const controlId = id ?? `orb-radio-${generated}`;
  return (
    <div className={cn("orb-choice", className)}>
      <RR.Item ref={ref} id={controlId} className="orb-radio" {...props}>
        <RR.Indicator className="orb-radio__indicator" />
      </RR.Item>
      <div className="orb-choice__text">
        <label htmlFor={controlId} className="orb-choice__label">
          {label}
        </label>
        {description && <span className="orb-choice__description">{description}</span>}
      </div>
    </div>
  );
});

/* ================================================================== Switch */

export interface SwitchProps extends ComponentPropsWithoutRef<typeof RSw.Root> {
  label?: ReactNode;
  description?: ReactNode;
  size?: "sm" | "md";
}

export const Switch = forwardRef<ElementRef<typeof RSw.Root>, SwitchProps>(function Switch(
  { className, label, description, id, size = "md", ...props },
  ref,
) {
  const generated = useId();
  const controlId = id ?? `orb-switch-${generated}`;
  const control = (
    <RSw.Root
      ref={ref}
      id={controlId}
      className={cn("orb-switch", `orb-switch--${size}`, !label && className)}
      {...props}
    >
      <RSw.Thumb className="orb-switch__thumb" />
    </RSw.Root>
  );
  if (!label) return control;
  return (
    <div className={cn("orb-choice orb-choice--switch", className)}>
      <div className="orb-choice__text">
        <label htmlFor={controlId} className="orb-choice__label">
          {label}
        </label>
        {description && <span className="orb-choice__description">{description}</span>}
      </div>
      {control}
    </div>
  );
});

/* ================================================================== Select */

export interface SelectOption {
  value: string;
  label: ReactNode;
  /** Plain-text label used for typeahead when `label` is not a string. */
  textValue?: string;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface SelectProps extends Omit<
  ComponentPropsWithoutRef<typeof RS.Root>,
  "children" | "dir"
> {
  options: SelectOption[];
  placeholder?: string;
  size?: "sm" | "md" | "lg";
  invalid?: boolean;
  /** Accessible name when not inside a `<Field>`. */
  "aria-label"?: string;
  id?: string;
  className?: string;
  /** Trigger styling. `ghost` is borderless until hovered — for inline property editing. */
  appearance?: "default" | "ghost";
}

/** Single-value select built on Radix Select (full keyboard + typeahead support). */
export const Select = forwardRef<HTMLButtonElement, SelectProps>(function Select(
  {
    options,
    placeholder = "Select…",
    size = "md",
    invalid,
    className,
    appearance = "default",
    "aria-label": ariaLabel,
    id,
    ...rootProps
  },
  ref,
) {
  const container = usePortalContainer();
  const a11y = useFieldControl({
    id,
    "aria-invalid": invalid || undefined,
    disabled: rootProps.disabled,
    required: rootProps.required,
  });
  return (
    <RS.Root {...rootProps} disabled={a11y.disabled} required={a11y.required}>
      <RS.Trigger
        ref={ref}
        id={a11y.id}
        aria-label={ariaLabel}
        aria-describedby={a11y["aria-describedby"]}
        aria-invalid={a11y["aria-invalid"]}
        className={cn(
          "orb-select",
          `orb-input--${size}`,
          appearance === "ghost" && "orb-select--ghost",
          a11y["aria-invalid"] && "orb-input--invalid",
          className,
        )}
      >
        <RS.Value placeholder={placeholder} />
        <RS.Icon className="orb-select__icon">
          <ChevronDown size={14} aria-hidden />
        </RS.Icon>
      </RS.Trigger>
      <RS.Portal container={container}>
        <RS.Content
          className="orb-menu orb-select__content"
          position="popper"
          sideOffset={6}
          collisionPadding={8}
        >
          <RS.Viewport>
            {options.map((o) => (
              <RS.Item
                key={o.value}
                value={o.value}
                disabled={o.disabled}
                textValue={o.textValue ?? (typeof o.label === "string" ? o.label : o.value)}
                className="orb-menu__item orb-menu__item--check"
              >
                <span className="orb-menu__indicator" aria-hidden>
                  <RS.ItemIndicator>
                    <Check size={12} strokeWidth={2.5} />
                  </RS.ItemIndicator>
                </span>
                {o.icon && (
                  <span className="orb-menu__icon" aria-hidden>
                    {o.icon}
                  </span>
                )}
                <RS.ItemText>{o.label}</RS.ItemText>
              </RS.Item>
            ))}
          </RS.Viewport>
        </RS.Content>
      </RS.Portal>
    </RS.Root>
  );
});
