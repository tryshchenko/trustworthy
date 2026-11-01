import { Dialog as RD } from "radix-ui";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { usePortalContainer } from "../../theme/ThemeProvider";
import { SearchList, type ListOption } from "../foundation/Combobox";
import { Kbd } from "../foundation/Feedback";

export interface CommandItem {
  id: string;
  label: string;
  group?: string;
  description?: string;
  icon?: ReactNode;
  /** Display-only shortcut hint, e.g. "C" or "⌘⇧P". */
  shortcut?: string;
  keywords?: string[];
  disabled?: boolean;
  onSelect: () => void;
}

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commands: CommandItem[];
  placeholder?: string;
  emptyMessage?: ReactNode;
  /** Visible hint row at the bottom. */
  footer?: ReactNode;
}

/** ⌘K command menu: a modal dialog containing a searchable, grouped command list. */
export function CommandPalette({
  open,
  onOpenChange,
  commands,
  placeholder = "Type a command or search…",
  emptyMessage = "No matching commands",
  footer,
}: CommandPaletteProps) {
  const container = usePortalContainer();
  const options = useMemo<ListOption[]>(
    () =>
      commands.map((c) => ({
        value: c.id,
        label: c.label,
        group: c.group,
        description: c.description,
        icon: c.icon,
        keywords: c.keywords,
        disabled: c.disabled,
      })),
    [commands],
  );
  const byId = useMemo(() => new Map(commands.map((c) => [c.id, c])), [commands]);

  return (
    <RD.Root open={open} onOpenChange={onOpenChange}>
      <RD.Portal container={container}>
        <RD.Overlay className="orb-overlay orb-overlay--light" />
        <RD.Content className="orb-command" aria-describedby={undefined}>
          <RD.Title className="orb-sr-only">Command palette</RD.Title>
          <SearchList
            options={options}
            inputLabel="Search commands"
            placeholder={placeholder}
            emptyMessage={emptyMessage}
            maxHeight={360}
            onSelect={(o) => {
              onOpenChange(false);
              // Run after the dialog closes so focus restoration doesn't fight the action.
              requestAnimationFrame(() => byId.get(o.value)?.onSelect());
            }}
            renderOption={(o) => {
              const cmd = byId.get(o.value);
              return (
                <>
                  {o.icon && (
                    <span className="orb-menu__icon" aria-hidden>
                      {o.icon}
                    </span>
                  )}
                  <span className="orb-menu__text">
                    {o.label}
                    {o.description && (
                      <span className="orb-menu__description">{o.description}</span>
                    )}
                  </span>
                  {cmd?.shortcut && <Kbd aria-hidden>{cmd.shortcut}</Kbd>}
                </>
              );
            }}
          />
          <div className="orb-command__footer" aria-hidden>
            {footer ?? (
              <>
                <span>
                  <Kbd>↑</Kbd>
                  <Kbd>↓</Kbd> navigate
                </span>
                <span>
                  <Kbd>↵</Kbd> select
                </span>
                <span>
                  <Kbd>esc</Kbd> close
                </span>
              </>
            )}
          </div>
        </RD.Content>
      </RD.Portal>
    </RD.Root>
  );
}

/* ============================================================== useHotkey */

export interface HotkeyOptions {
  /** Fire even when focus is in a text field. Default false (except for mod-combos). */
  allowInInputs?: boolean;
  enabled?: boolean;
}

function isEditable(el: EventTarget | null) {
  const t = el as HTMLElement | null;
  return Boolean(t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)));
}

/**
 * Register a global keyboard shortcut. `combo` examples: `"mod+k"` (⌘ on macOS,
 * Ctrl elsewhere), `"c"`, `"shift+?"`, `"/"`.
 */
export function useHotkey(
  combo: string,
  handler: (e: KeyboardEvent) => void,
  options: HotkeyOptions = {},
) {
  const ref = useRef(handler);
  ref.current = handler;
  const { allowInInputs, enabled = true } = options;
  useEffect(() => {
    if (!enabled) return;
    const parts = combo.toLowerCase().split("+");
    const key = parts.pop()!;
    const needMod = parts.includes("mod");
    const needShift = parts.includes("shift");
    const needAlt = parts.includes("alt");
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing) return;
      const mod = e.metaKey || e.ctrlKey;
      if (needMod !== mod || needAlt !== e.altKey) return;
      if (needShift && !e.shiftKey) return;
      if (e.key.toLowerCase() !== key) return;
      if (!needMod && !allowInInputs && isEditable(e.target)) return;
      // Don't hijack keys while a dialog/menu owns focus, unless it's a mod-combo.
      if (
        !needMod &&
        (e.target as HTMLElement | null)?.closest?.("[role=dialog],[role=menu],[role=listbox]")
      )
        return;
      e.preventDefault();
      ref.current(e);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [combo, allowInInputs, enabled]);
}
