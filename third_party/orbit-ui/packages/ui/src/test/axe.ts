import axe from "axe-core";

/** Run axe on a container; colour-contrast is skipped (jsdom can't compute it — covered by token + e2e tests). */
export async function axeViolations(container: Element) {
  const results = await axe.run(container, {
    rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
  });
  return results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html).join(" | ")}`);
}
