import { describe, expect, it } from "vitest";
import { contrastRatio, themeNames, themes, toneNames } from "./index";

/**
 * Text must stay legible not only on opaque surfaces but on translucent glass
 * composited over the darkest/brightest parts of each theme's real backdrop.
 */
const AA = 4.5;

it("danger button (white on red-600) meets AA", () => {
  expect(contrastRatio("#FFFFFF", "#DB1F36")).toBeGreaterThanOrEqual(AA);
});

describe.each(themeNames)("%s theme contrast", (name) => {
  const t = themes[name].tokens;
  // Backdrops that actually render behind glass in this theme.
  const backdrops = [t["color-canvas"], t["scene-sky-top"], t["scene-sky-bottom"]].filter((c) =>
    c.startsWith("#"),
  );
  const opaque = [t["color-surface-solid"], t["color-surface-raised"], t["color-surface-sunken"]];
  const glass = ["glass-subtle-bg", "glass-standard-bg", "glass-raised-bg"] as const;

  for (const text of [
    "color-text-primary",
    "color-text-secondary",
    "color-text-tertiary",
  ] as const) {
    it(`${text} meets AA on opaque surfaces`, () => {
      for (const bg of opaque) expect(contrastRatio(t[text], bg)).toBeGreaterThanOrEqual(AA);
    });
    it(`${text} meets AA on glass over every backdrop`, () => {
      for (const backdrop of backdrops)
        for (const g of glass)
          expect(
            contrastRatio(t[text], backdrop, t[g]),
            `${g} over ${backdrop}`,
          ).toBeGreaterThanOrEqual(AA);
    });
  }

  it("text-on-accent meets AA on the accent fill", () => {
    expect(contrastRatio(t["color-text-on-accent"], t["color-accent"])).toBeGreaterThanOrEqual(AA);
    expect(
      contrastRatio(t["color-text-on-accent"], t["color-accent-hover"]),
    ).toBeGreaterThanOrEqual(AA);
  });

  it("accent text meets AA on accent-soft", () => {
    expect(
      contrastRatio(t["color-accent-text"], t["color-surface-solid"], t["color-accent-soft"]),
    ).toBeGreaterThanOrEqual(AA);
  });

  it.each(toneNames)("%s solid badge (surface text on tone fg) meets AA", (tone) => {
    expect(contrastRatio(t["color-surface-solid"], t[`color-${tone}-fg`])).toBeGreaterThanOrEqual(
      AA,
    );
  });

  it.each(toneNames)("%s tone foreground meets AA on its background", (tone) => {
    const ratio = contrastRatio(
      t[`color-${tone}-fg`],
      t["color-surface-solid"],
      t[`color-${tone}-bg`],
    );
    expect(ratio).toBeGreaterThanOrEqual(AA);
  });
});

/** Themed chrome (e.g. Scenic's dark glass sidebar/header) over the scene behind it. */
describe.each(themeNames.filter((n) => themes[n].chrome))("%s chrome contrast", (name) => {
  const t = { ...themes[name].tokens, ...themes[name].chrome } as typeof themes.minimal.tokens;
  const scene = themes[name].tokens;
  const backdrops = [scene["scene-sky-top"], scene["scene-sky-bottom"]];
  const glass = ["glass-subtle-bg", "glass-standard-bg", "glass-raised-bg"] as const;

  for (const text of [
    "color-text-primary",
    "color-text-secondary",
    "color-text-tertiary",
    "color-accent-text",
  ] as const) {
    it(`${text} meets AA on chrome glass over the scene`, () => {
      for (const backdrop of backdrops)
        for (const g of glass)
          expect(
            contrastRatio(t[text], backdrop, t[g]),
            `${g} over ${backdrop}`,
          ).toBeGreaterThanOrEqual(AA);
    });
  }

  it("text meets AA on chrome's opaque surfaces", () => {
    for (const bg of [t["color-surface-solid"], t["color-surface-raised"]])
      for (const text of ["color-text-primary", "color-text-secondary"] as const)
        expect(contrastRatio(t[text], bg)).toBeGreaterThanOrEqual(AA);
  });

  it.each(toneNames)("%s solid badge meets AA inside chrome", (tone) => {
    expect(contrastRatio(t["color-surface-solid"], t[`color-${tone}-fg`])).toBeGreaterThanOrEqual(
      AA,
    );
  });
});
