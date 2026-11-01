import { palette, radius, space, themes, typeStyles, type ThemeName } from "@orbit/tokens";
import { GlassPanel, useTheme } from "@orbit/ui";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta: Meta = {
  title: "Foundations/Tokens",
  parameters: {
    docs: {
      description: {
        component:
          "Design tokens from `@orbit/tokens`. Every value is exposed as a `--orb-*` CSS custom property.",
      },
    },
  },
};
export default meta;
type Story = StoryObj;

const hues = ["blue", "cyan", "teal", "sky", "slate", "green", "amber", "red", "violet"] as const;

export const ColorScales: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {hues.map((hue) => (
        <div
          key={hue}
          style={{
            display: "grid",
            gridTemplateColumns: "80px 1fr",
            alignItems: "center",
            gap: 12,
          }}
        >
          <code style={{ fontSize: 12 }}>{hue}</code>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {Object.entries(palette[hue]).map(([step, value]) => (
              <div key={step} style={{ width: 72 }}>
                <div
                  style={{
                    height: 40,
                    borderRadius: 8,
                    background: value,
                    boxShadow: "inset 0 0 0 1px rgba(0,0,0,.06)",
                  }}
                />
                <div style={{ fontSize: 11, marginTop: 4 }}>
                  <strong>{step}</strong> <span style={{ opacity: 0.7 }}>{value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  ),
};

function SemanticSwatches() {
  const { theme } = useTheme();
  const tokens = themes[theme as ThemeName].tokens;
  const entries = Object.entries(tokens).filter(
    ([k]) => k.startsWith("color-") && !k.includes("gradient") && !k.includes("image"),
  );
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: 10,
      }}
    >
      {entries.map(([name, value]) => (
        <div
          key={name}
          className="orb-card orb-card--solid"
          style={{ display: "flex", gap: 10, alignItems: "center", padding: 8 }}
        >
          <span
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: `var(--orb-${name})`,
              boxShadow: "inset 0 0 0 1px var(--orb-color-border-default)",
              flexShrink: 0,
            }}
          />
          <span style={{ minWidth: 0 }}>
            <code style={{ fontSize: 11, display: "block" }}>--orb-{name}</code>
            <span
              style={{
                fontSize: 11,
                color: "var(--orb-color-text-secondary)",
                wordBreak: "break-all",
              }}
            >
              {value}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

/** Semantic colours for the active theme — switch the theme in the toolbar. */
export const SemanticColors: Story = { render: () => <SemanticSwatches /> };

export const Typography: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {Object.entries(typeStyles).map(([role, s]) => (
        <div
          key={role}
          style={{
            display: "grid",
            gridTemplateColumns: "160px 1fr",
            alignItems: "baseline",
            gap: 16,
          }}
        >
          <code style={{ fontSize: 12 }}>
            {role}
            <br />
            <span style={{ opacity: 0.6 }}>
              {s.size} / {s.weight}
            </span>
          </code>
          <span className={`orb-type-${role}`}>Ship SSO for enterprise workspaces</span>
        </div>
      ))}
    </div>
  ),
};

export const SpacingAndRadius: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 48, flexWrap: "wrap" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {Object.entries(space).map(([k, v]) => (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <code style={{ width: 90, fontSize: 12 }}>space-{k}</code>
            <span
              style={{
                width: v,
                height: 14,
                borderRadius: 3,
                background: "var(--orb-color-accent-gradient)",
              }}
            />
            <span style={{ fontSize: 12, opacity: 0.7 }}>{v}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignContent: "flex-start" }}>
        {Object.entries(radius).map(([k, v]) => (
          <div key={k} style={{ textAlign: "center" }}>
            <div className="orb-card--solid" style={{ width: 72, height: 72, borderRadius: v }} />
            <code style={{ fontSize: 11 }}>
              {k} · {v}
            </code>
          </div>
        ))}
      </div>
    </div>
  ),
};

export const ElevationAndMaterials: Story = {
  parameters: { orbitBackground: "full" },
  render: () => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        gap: 20,
      }}
    >
      {(["subtle", "standard", "raised", "solid", "selected"] as const).map((variant) => (
        <GlassPanel key={variant} variant={variant} elevation="raised" style={{ minHeight: 120 }}>
          <strong>
            {variant === "solid" || variant === "selected"
              ? `surface/${variant}`
              : `glass/${variant}`}
          </strong>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--orb-color-text-secondary)" }}>
            Readable text on the material, over real scenery.
          </p>
        </GlassPanel>
      ))}
      {(["xs", "sm", "md", "lg", "xl"] as const).map((s) => (
        <div
          key={s}
          className="orb-card--solid"
          style={{
            borderRadius: 14,
            minHeight: 90,
            display: "grid",
            placeItems: "center",
            boxShadow: `var(--orb-shadow-${s})`,
          }}
        >
          <code>shadow-{s}</code>
        </div>
      ))}
    </div>
  ),
};
