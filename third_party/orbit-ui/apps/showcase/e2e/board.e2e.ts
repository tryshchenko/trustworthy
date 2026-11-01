import { card, column, expect, expectNoA11yViolations, test } from "./fixtures";

test.describe("Board", () => {
  test("renders the sprint board with four status columns", async ({ app }) => {
    for (const name of ["To do", "In progress", "In review", "Done"])
      await expect(column(app, name)).toBeVisible();
    await expect(card(app, "PLAT-87")).toBeVisible();
    await expect(
      column(app, "In progress").getByRole("button", { name: /^PLAT-87:/ }),
    ).toBeVisible();
  });

  test("creates an issue with validation", async ({ app }) => {
    await app.keyboard.press("c");
    const dialog = app.getByRole("dialog", { name: "Create issue" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Create issue" }).click();
    const summary = dialog.getByRole("textbox", { name: /Summary/ });
    await expect(summary).toHaveAttribute("aria-invalid", "true");
    await expect(dialog.getByRole("alert")).toHaveText(/Enter a summary/);
    await summary.fill("Add SAML metadata upload");
    await dialog.getByRole("button", { name: "Create issue" }).click();
    await expect(dialog).toBeHidden();
    await expect(app.getByText("PLAT-111 created")).toBeVisible();
    await expect(
      column(app, "To do").getByRole("button", { name: "PLAT-111: Add SAML metadata upload" }),
    ).toBeVisible();
  });

  test("opens, edits and closes the issue inspector", async ({ app }) => {
    await card(app, "PLAT-90").click();
    const inspector = app.getByRole("complementary", { name: /PLAT-90/ });
    await expect(inspector).toBeVisible();
    await expect(app).toHaveURL(/#\/board\/PLAT-90$/);

    // Edit title inline
    await inspector.getByRole("button", { name: /^Summary:/ }).click();
    const title = inspector.getByRole("textbox", { name: "Summary" });
    await title.fill("Rate-limit public REST API per key");
    await title.press("Enter");
    await expect(card(app, "PLAT-90")).toHaveAccessibleName(
      "PLAT-90: Rate-limit public REST API per key",
    );

    // Change status → card moves column
    await inspector.getByRole("combobox", { name: "Status" }).click();
    await app.getByRole("option", { name: "In review" }).click();
    await expect(column(app, "In review").getByRole("button", { name: /^PLAT-90:/ })).toBeVisible();

    // Change priority
    await inspector.getByRole("combobox", { name: "Priority" }).click();
    await app.getByRole("option", { name: "Highest" }).click();
    await expect(card(app, "PLAT-90")).toHaveAccessibleDescription(/Highest priority/);

    // Comment
    await inspector.getByRole("textbox", { name: "Comment" }).fill("Agreed on 100 req/min.");
    await inspector.getByRole("button", { name: "Comment", exact: true }).click();
    await expect(inspector.getByText("Agreed on 100 req/min.")).toBeVisible();

    // Escape closes and returns focus
    await inspector.focus();
    await app.keyboard.press("Escape");
    await expect(inspector).toBeHidden();
    await expect(app).toHaveURL(/#\/board$/);
  });

  test("drags an issue to another column with the mouse and persists it", async ({ app }) => {
    const source = card(app, "PLAT-90");
    const target = column(app, "Done");
    const s = (await source.boundingBox())!;
    const t = (await target.boundingBox())!;
    await app.mouse.move(s.x + s.width / 2, s.y + 20);
    await app.mouse.down();
    await app.mouse.move(s.x + s.width / 2 + 20, s.y + 40, { steps: 5 });
    await app.mouse.move(t.x + t.width / 2, t.y + 120, { steps: 15 });
    await app.mouse.up();
    await expect(target.getByRole("button", { name: /^PLAT-90:/ })).toBeVisible();
    await app.reload();
    await expect(column(app, "Done").getByRole("button", { name: /^PLAT-90:/ })).toBeVisible();
  });

  test("moves an issue with the keyboard (Space, arrows, Space)", async ({ app }) => {
    // Each step is synchronised on the screen-reader announcement, as a user would wait for it.
    const live = app.locator("[id^=DndLiveRegion]");
    await card(app, "PLAT-90").focus();
    await app.keyboard.press("Space");
    await expect(live).toContainText(/PLAT-90/);
    await app.waitForTimeout(50); // the sensor attaches its key listener on the next tick
    await app.keyboard.press("ArrowRight");
    await expect(live).toContainText(/moved to In progress/);
    await app.keyboard.press("Space");
    await expect(live).toContainText(/Dropped PLAT-90 .* in In progress/);
    await expect(
      column(app, "In progress").getByRole("button", { name: /^PLAT-90:/ }),
    ).toBeVisible();
    await expect(card(app, "PLAT-90")).toBeFocused();
  });

  test("moves an issue without dragging via the actions menu", async ({ app }) => {
    await card(app, "PLAT-90").hover();
    await app.getByRole("button", { name: "Actions for PLAT-90" }).click();
    await app.getByRole("menuitemradio", { name: "Done" }).click();
    await expect(column(app, "Done").getByRole("button", { name: /^PLAT-90:/ })).toBeVisible();
  });

  test("filters by search text and assignee", async ({ app }) => {
    await app.keyboard.press("/");
    const search = app.getByRole("textbox", { name: "Search issues" });
    await expect(search).toBeFocused();
    await search.fill("SSO");
    await expect(card(app, "PLAT-87")).toBeVisible();
    await expect(card(app, "PLAT-90")).toHaveCount(0);
    await search.fill("");
    await app.getByRole("button", { name: "Assignee" }).click();
    await app.getByRole("option", { name: "Marco Silva" }).click();
    await app.keyboard.press("Escape");
    await expect(card(app, "PLAT-90")).toBeVisible();
    await expect(card(app, "PLAT-87")).toHaveCount(0);
    await app.getByRole("button", { name: "Clear filters" }).first().click();
    await expect(card(app, "PLAT-87")).toBeVisible();
  });

  test("has no axe violations (including colour contrast) on the board and inspector", async ({
    app,
  }) => {
    await expectNoA11yViolations(app);
    await card(app, "PLAT-87").click();
    await expect(app.getByRole("complementary", { name: /PLAT-87/ })).toBeVisible();
    await expectNoA11yViolations(app);
  });
});
