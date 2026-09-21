import { expect, test } from "@playwright/test";

test("renders the institutional landing page", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /La Casa del Naipe/i })).toBeVisible();
  await expect(page.getByText("Archivo · Catálogo · Colección")).toBeVisible();
});
