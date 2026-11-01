import { composeStories } from "@storybook/react-vite";
import { describe, expect, it } from "vitest";
import axe from "axe-core";

/**
 * Interaction tests: every story with a `play` function is rendered in jsdom and
 * its play function executed. Every story is also smoke-rendered and scanned with axe.
 */
const modules = import.meta.glob<Record<string, unknown>>("./*.stories.tsx", { eager: true });

// Pointer-geometry-dependent interactions (dnd-kit keyboard sensor reads layout
// boxes, which jsdom doesn't compute) are covered by Playwright e2e instead.
const browserOnly = new Set(["KanbanBoard › Interactive"]);

for (const [file, mod] of Object.entries(modules)) {
  const stories = composeStories(mod as Parameters<typeof composeStories>[0]);
  const title = (mod.default as { title?: string })?.title ?? file;
  describe(title, () => {
    for (const [name, Story] of Object.entries(stories) as [
      string,
      { run: () => Promise<void>; play?: unknown },
    ][]) {
      const id = `${title.split("/").pop()} › ${name}`;
      const run = browserOnly.has(id) ? it.skip : it;
      run(`${name}${Story.play ? " (interaction)" : ""}`, async () => {
        await Story.run();
        const root = document.body;
        const results = await axe.run(root, {
          rules: {
            // jsdom has no layout/colour engine; contrast is verified by token tests and Playwright.
            "color-contrast": { enabled: false },
            region: { enabled: false },
          },
        });
        expect(results.violations.map((v) => `${v.id}: ${v.nodes[0]?.html}`)).toEqual([]);
      });
    }
  });
}
