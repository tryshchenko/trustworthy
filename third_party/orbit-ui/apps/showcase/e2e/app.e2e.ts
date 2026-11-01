import { card, expect, expectNoA11yViolations, test } from "./fixtures";

test.describe("Application", () => {
  test("command palette switches theme and navigates", async ({ app }) => {
    await app.keyboard.press("Control+k");
    const palette = app.getByRole("dialog", { name: "Command palette" });
    await expect(palette).toBeVisible();
    await palette.getByRole("combobox").fill("dark");
    await app.keyboard.press("Enter");
    await expect(app.locator("html")).toHaveAttribute("data-orbit-theme", "dark");
    await app.keyboard.press("Control+k");
    await app
      .getByRole("dialog", { name: "Command palette" })
      .getByRole("combobox")
      .fill("PLAT-89");
    await app.keyboard.press("Enter");
    await expect(app.getByRole("complementary", { name: /PLAT-89/ })).toBeVisible();
  });

  for (const theme of ["minimal", "scenic", "dark", "accessible"] as const) {
    test(`theme "${theme}" passes axe incl. contrast over real backgrounds`, async ({ app }) => {
      await app.evaluate((t) => {
        localStorage.setItem("orbit-projects:theme", JSON.stringify({ theme: t }));
      }, theme);
      await app.reload();
      await expect(app.locator("html")).toHaveAttribute("data-orbit-theme", theme);
      await expect(card(app, "PLAT-87")).toBeVisible();
      await expectNoA11yViolations(app);
    });
  }

  test("settings change density and persist", async ({ app }) => {
    await app.getByRole("link", { name: "Settings" }).click();
    await app.getByRole("radio", { name: /Compact/ }).click();
    await expect(app.locator("html")).toHaveAttribute("data-orbit-density", "compact");
    await app.getByRole("switch", { name: /Reduce transparency/ }).click();
    await expect(app.locator("html")).toHaveAttribute("data-orbit-transparency", "reduced");
    await app.reload();
    await expect(app.locator("html")).toHaveAttribute("data-orbit-density", "compact");
    await expectNoA11yViolations(app);
  });

  test("keyboard: skip link, tabs and shortcuts dialog", async ({ app }) => {
    await app.keyboard.press("Tab");
    const skip = app.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    await app.keyboard.press("Enter");
    await expect(app.locator("main")).toBeFocused();
    await app.keyboard.press("Shift+?");
    await expect(app.getByRole("dialog", { name: "Keyboard shortcuts" })).toBeVisible();
    await app.keyboard.press("Escape");
    await app.getByRole("tab", { name: "Board" }).focus();
    await app.keyboard.press("ArrowLeft");
    await expect(app.getByRole("tab", { name: "Issues" })).toHaveAttribute("aria-selected", "true");
    await expect(app).toHaveURL(/#\/issues/);
  });

  test("issues view virtualises thousands of rows", async ({ app }) => {
    await app.goto("/#/issues");
    await app.getByRole("switch", { name: /2,000 synthetic issues/ }).click();
    const list = app.getByRole("list", { name: "Issues" });
    await expect(list.getByRole("listitem").first()).toHaveAttribute("aria-setsize", "2024");
    expect(await list.getByRole("listitem").count()).toBeLessThan(80);
    await expectNoA11yViolations(app);
  });

  test("overview and unavailable views are honest about scope", async ({ app }) => {
    await app.getByRole("tab", { name: "Overview" }).click();
    await expect(app.getByRole("table", { name: "Team workload" })).toBeVisible();
    await expectNoA11yViolations(app);
    await app.getByRole("tab", { name: /Roadmap/ }).click();
    await expect(app.getByText("Not in demo")).toBeVisible();
  });
});

test.describe("Mobile", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test("navigation drawer and full-screen inspector", async ({ app }) => {
    await app.getByRole("button", { name: "Open navigation" }).click();
    const drawer = app.getByRole("dialog", { name: "Navigation" });
    await expect(drawer).toBeVisible();
    await drawer.getByRole("link", { name: /Issues/ }).click();
    await expect(drawer).toBeHidden();
    await expect(app).toHaveURL(/#\/issues/);
    await app.goto("/#/board/PLAT-87");
    const inspector = app.getByRole("dialog", { name: /PLAT-87/ });
    await expect(inspector).toBeVisible();
    const box = (await inspector.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(389);
    await expectNoA11yViolations(app);
    await app.getByRole("button", { name: "Close inspector" }).click();
    await expect(inspector).toBeHidden();
  });
});
