/**
 * Minimal WCAG 2.x contrast utilities, used by the token test-suite to verify
 * text legibility on translucent glass composited over real backgrounds.
 */

export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export function parseColor(input: string): RGBA {
  const s = input.trim();
  if (s.startsWith("#")) {
    const hex = s.slice(1);
    const full = hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex;
    const n = parseInt(full.slice(0, 6), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
  }
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (m?.[1]) {
    const [r = 0, g = 0, b = 0, a = 1] = m[1].split(",").map((x) => parseFloat(x));
    return { r, g, b, a };
  }
  throw new Error(`Unsupported color: ${input}`);
}

/** Composite a (possibly translucent) foreground colour over an opaque background. */
export function composite(fg: RGBA, bg: RGBA): RGBA {
  const a = fg.a;
  return {
    r: fg.r * a + bg.r * (1 - a),
    g: fg.g * a + bg.g * (1 - a),
    b: fg.b * a + bg.b * (1 - a),
    a: 1,
  };
}

function channel(c: number) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function luminance({ r, g, b }: RGBA) {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/**
 * Contrast ratio between text and its background. Translucent layers in
 * `backgroundStack` are composited bottom-to-top (first item = bottom, must be opaque).
 */
export function contrastRatio(text: string, ...backgroundStack: string[]): number {
  if (backgroundStack.length === 0) throw new Error("contrastRatio needs a background");
  let bg = parseColor(backgroundStack[0]!);
  for (const layer of backgroundStack.slice(1)) bg = composite(parseColor(layer), bg);
  const fg = composite(parseColor(text), bg);
  const [l1, l2] = [luminance(fg), luminance(bg)].sort((a, b) => b - a) as [number, number];
  return (l1 + 0.05) / (l2 + 0.05);
}
