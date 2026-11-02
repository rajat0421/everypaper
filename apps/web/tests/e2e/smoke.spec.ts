import { test, expect } from "@playwright/test";

test("loads the page, renders the canvas, and shows the toolbar", async ({ page }) => {
  await page.goto("/");

  const canvas = page.getByTestId("everypaper-canvas");
  await expect(canvas).toBeVisible({ timeout: 15_000 });

  const toolbar = page.getByRole("toolbar", { name: "Drawing tools" });
  await expect(toolbar).toBeVisible();

  await expect(page.getByRole("button", { name: /Pencil/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Eraser/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Text/ })).toBeVisible();

  // The app must not hard-crash even with no backend reachable.
  await expect(page.locator("body")).not.toContainText("Something went wrong");
});
