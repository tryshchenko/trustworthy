import AxeBuilder from "@axe-core/playwright";
import { test as base, expect, type Page } from "@playwright/test";

/** Fixed clock so relative dates (due dates, "9 days left", "3 hours ago") are deterministic. */
export const FIXED_NOW = new Date("2026-10-03T10:00:00Z");

export const test = base.extend<{ app: Page; fixedClock: boolean }>({
  // Visual tests pin the clock (stable dates in screenshots). Functional tests keep real
  // time because a frozen clock also stalls Web Animations (e.g. the drag drop animation).
  fixedClock: [false, { option: true }],
  app: async ({ page, fixedClock }, use) => {
    if (fixedClock) await page.clock.setFixedTime(FIXED_NOW);
    // Fresh demo data + default theme for every test.
    await page.addInitScript(() => {
      if (!sessionStorage.getItem("orbit-e2e-init")) {
        localStorage.clear();
        sessionStorage.setItem("orbit-e2e-init", "1");
      }
    });
    await page.goto("/#/board");
    await expect(page.getByRole("region", { name: "Sprint 24 board" })).toBeVisible();
    await use(page);
  },
});

export { expect };

export function column(page: Page, name: string) {
  return page.getByRole("region", { name, exact: true });
}

export function card(page: Page, key: string) {
  return page.getByRole("button", { name: new RegExp(`^${key}:`) });
}

/** Full axe scan including colour contrast, against the real rendered (translucent) UI. */
export async function expectNoA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const summary = results.violations.map(
    (v) =>
      `${v.id} (${v.impact}): ${v.nodes
        .slice(0, 3)
        .map((n) => n.target.join(" "))
        .join(", ")}`,
  );
  expect(summary).toEqual([]);
}
