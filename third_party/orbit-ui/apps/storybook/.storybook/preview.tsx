import "@fontsource-variable/inter";
import "@orbit/tokens/tokens.css";
import "@orbit/ui/styles.css";

import { themes, type ThemeName } from "@orbit/tokens";
import { AeroBackground, ThemeProvider, Toaster } from "@orbit/ui";
import type { Decorator, Preview } from "@storybook/react-vite";

type ThemeGlobal = ThemeName | "side-by-side";

/**
 * Every story renders inside a locally-scoped ThemeProvider so the toolbar can
 * switch theme, density and transparency — or render all four themes side by side.
 */
const withOrbit: Decorator = (Story, ctx) => {
  const theme = (ctx.globals.theme ?? "minimal") as ThemeGlobal;
  const density = ctx.globals.density ?? "comfortable";
  const transparency = ctx.globals.transparency ?? "auto";
  // `orbitLayout: "fullscreen"` stories (app shells) fill the canvas; in Docs they get a fixed-height frame.
  const fullscreen = ctx.parameters.orbitLayout === "fullscreen";
  const inDocs = ctx.viewMode === "docs";
  const background = ctx.parameters.orbitBackground ?? "soft";
  const frame = (t: ThemeName, label?: string) => (
    <ThemeProvider
      key={`${t}-${density}-${transparency}`}
      scope="local"
      theme={t}
      density={density}
      defaultTransparency={transparency}
      className={`orbit-story-frame${fullscreen ? " orbit-story-frame--fullscreen" : ""}`}
      style={fullscreen && inDocs ? { height: 680 } : inDocs ? undefined : { minHeight: "100vh" }}
    >
      {background !== "none" && (
        <AeroBackground
          position="absolute"
          scenery={background === "theme" ? "auto" : background}
        />
      )}
      {label && <span className="orbit-story-label">{label}</span>}
      <div style={{ position: "relative", zIndex: 1, height: fullscreen ? "100%" : undefined }}>
        <Story />
      </div>
      <Toaster />
    </ThemeProvider>
  );
  if (theme === "side-by-side") {
    return (
      <div className="orbit-story-grid">
        {(Object.keys(themes) as ThemeName[]).map((t) => (
          <div key={t}>{frame(t, themes[t].label)}</div>
        ))}
      </div>
    );
  }
  return frame(theme);
};

const preview: Preview = {
  decorators: [withOrbit],
  globalTypes: {
    theme: {
      description: "Orbit theme",
      toolbar: {
        title: "Theme",
        icon: "paintbrush",
        items: [
          { value: "minimal", title: "Aero Minimal" },
          { value: "scenic", title: "Aero Scenic" },
          { value: "dark", title: "Aero Dark" },
          { value: "accessible", title: "Accessible" },
          { value: "side-by-side", title: "All themes side by side" },
        ],
        dynamicTitle: true,
      },
    },
    density: {
      description: "Density",
      toolbar: {
        title: "Density",
        icon: "component",
        items: [
          { value: "comfortable", title: "Comfortable" },
          { value: "compact", title: "Compact" },
        ],
        dynamicTitle: true,
      },
    },
    transparency: {
      description: "Transparency",
      toolbar: {
        title: "Transparency",
        icon: "mirror",
        items: [
          { value: "auto", title: "Glass (auto)" },
          { value: "reduced", title: "Reduced transparency" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: "minimal", density: "comfortable", transparency: "auto" },
  parameters: {
    layout: "fullscreen",
    controls: { expanded: true, matchers: { color: /(background|color)$/i, date: /Date$/i } },
    a11y: { test: "error" },
    options: {
      storySort: {
        order: [
          "Introduction",
          "Foundations",
          "Components",
          "Aero",
          "Product",
          "Patterns",
          "Guides",
        ],
      },
    },
    viewport: {
      options: {
        mobile: { name: "Mobile (390)", styles: { width: "390px", height: "844px" } },
        tablet: { name: "Tablet (834)", styles: { width: "834px", height: "1112px" } },
        laptop: { name: "Laptop (1280)", styles: { width: "1280px", height: "800px" } },
        desktop: { name: "Desktop (1440)", styles: { width: "1440px", height: "900px" } },
      },
    },
  },
};

export default preview;
