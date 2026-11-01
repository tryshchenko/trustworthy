import type { DensityName, ThemeName } from "@orbit/tokens";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "../utils/cn";
import { useControllableState } from "../utils/use-controllable-state";

export type TransparencyPreference = "auto" | "reduced";
export type MotionPreference = "auto" | "reduced";

export interface ThemeSettings {
  theme: ThemeName;
  density: DensityName;
  transparency: TransparencyPreference;
  motion: MotionPreference;
}

export interface ThemeContextValue extends ThemeSettings {
  setTheme: (theme: ThemeName) => void;
  setDensity: (density: DensityName) => void;
  setTransparency: (value: TransparencyPreference) => void;
  setMotion: (value: MotionPreference) => void;
  /** Element overlays should portal into so they inherit scoped theme variables. */
  portalContainer: HTMLElement | null;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export interface ThemeProviderProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  children?: ReactNode;
  /** Controlled theme. */
  theme?: ThemeName;
  defaultTheme?: ThemeName;
  onThemeChange?: (theme: ThemeName) => void;
  /** Controlled density. */
  density?: DensityName;
  defaultDensity?: DensityName;
  onDensityChange?: (density: DensityName) => void;
  defaultTransparency?: TransparencyPreference;
  defaultMotion?: MotionPreference;
  /**
   * - `"document"` (default) applies attributes to `<html>` so portalled overlays inherit them.
   * - `"local"` scopes the theme to a wrapper element; overlays portal into it.
   */
  scope?: "document" | "local";
  /** Persist uncontrolled settings to localStorage under this key. */
  storageKey?: string;
}

function readStored(key: string | undefined): Partial<ThemeSettings> {
  if (!key || typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "{}") as Partial<ThemeSettings>;
  } catch {
    return {};
  }
}

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Supplies theme, density, transparency and motion preferences to Orbit
 * components via `data-orbit-*` attributes consumed by `@orbit/tokens` CSS.
 */
export function ThemeProvider({
  children,
  theme: themeProp,
  defaultTheme = "minimal",
  onThemeChange,
  density: densityProp,
  defaultDensity = "comfortable",
  onDensityChange,
  defaultTransparency = "auto",
  defaultMotion = "auto",
  scope = "document",
  storageKey,
  className,
  ...rest
}: ThemeProviderProps) {
  const [stored] = useState(() => readStored(storageKey));
  const [theme, setTheme] = useControllableState(
    themeProp,
    stored.theme ?? defaultTheme,
    onThemeChange,
  );
  const [density, setDensity] = useControllableState(
    densityProp,
    stored.density ?? defaultDensity,
    onDensityChange,
  );
  const [transparency, setTransparency] = useState<TransparencyPreference>(
    stored.transparency ?? defaultTransparency,
  );
  const [motion, setMotion] = useState<MotionPreference>(stored.motion ?? defaultMotion);
  const [localEl, setLocalEl] = useState<HTMLDivElement | null>(null);

  const attrs = useMemo(
    () => ({
      "data-orbit-theme": theme,
      "data-orbit-density": density,
      "data-orbit-transparency": transparency === "reduced" ? "reduced" : undefined,
      "data-orbit-motion": motion === "reduced" ? "reduced" : undefined,
    }),
    [theme, density, transparency, motion],
  );

  useIsoLayoutEffect(() => {
    if (scope !== "document") return;
    const el = document.documentElement;
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined) el.removeAttribute(k);
      else el.setAttribute(k, v);
    }
    el.classList.add("orb-root");
  }, [attrs, scope]);

  useEffect(() => {
    if (!storageKey) return;
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({ theme, density, transparency, motion }),
      );
    } catch {
      /* storage unavailable (private mode) — settings simply won't persist */
    }
  }, [storageKey, theme, density, transparency, motion]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      density,
      transparency,
      motion,
      setTheme,
      setDensity,
      setTransparency,
      setMotion,
      portalContainer: scope === "local" ? localEl : null,
    }),
    [theme, density, transparency, motion, setTheme, setDensity, scope, localEl],
  );

  return (
    <ThemeContext.Provider value={value}>
      {scope === "local" ? (
        <div ref={setLocalEl} {...attrs} className={cn("orb-root", className)} {...rest}>
          {children}
        </div>
      ) : (
        children
      )}
    </ThemeContext.Provider>
  );
}

const fallback: ThemeContextValue = {
  theme: "minimal",
  density: "comfortable",
  transparency: "auto",
  motion: "auto",
  setTheme: () => {},
  setDensity: () => {},
  setTransparency: () => {},
  setMotion: () => {},
  portalContainer: null,
};

/** Read and update the current Orbit theme settings. Safe to call outside a provider. */
export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext) ?? fallback;
}

/** Container for portalled overlays (`undefined` = document.body). */
export function usePortalContainer(): HTMLElement | undefined {
  return useContext(ThemeContext)?.portalContainer ?? undefined;
}

/** Convenience hook returning a stable cycle function, used by theme toggles. */
export function useCycleTheme(order: ThemeName[] = ["minimal", "scenic", "dark", "accessible"]) {
  const { theme, setTheme } = useTheme();
  return useCallback(() => {
    const i = order.indexOf(theme);
    setTheme(order[(i + 1) % order.length] ?? "minimal");
  }, [order, theme, setTheme]);
}
