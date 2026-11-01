import { expect, test } from "./fixtures";

test.use({ fixedClock: true });

/**
 * Visual regression baselines. Generate/refresh with:
 *   pnpm test:visual --update-snapshots
 * Baselines are platform-specific (fonts/rendering) — regenerate them in CI's image.
 */
for (const theme of ["minimal", "scenic", "dark", "accessible"] as const) {
  test(`board – ${theme}`, async ({ app }) => {
    await app.evaluate(
      (t) => localStorage.setItem("orbit-projects:theme", JSON.stringify({ theme: t })),
      theme,
    );
    await app.reload();
    await expect(app.getByRole("button", { name: /^PLAT-87:/ })).toBeVisible();
    await expect(app).toHaveScreenshot(`board-${theme}.png`);
  });
}

test("board with inspector", async ({ app }) => {
  await app.goto("/#/board/PLAT-87");
  await expect(app.getByRole("complementary", { name: /PLAT-87/ })).toBeVisible();
  await expect(app).toHaveScreenshot("board-inspector.png");
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test("board – mobile", async ({ app }) => {
    await expect(app).toHaveScreenshot("board-mobile.png");
  });
});
