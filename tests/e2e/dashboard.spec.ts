import { test, expect, productInput } from "./fixtures";

test("dashboard statistics and charts reflect persisted inventory", async ({ page, inventory }) => {
  await page.goto("/");
  await expect(page.getByText("Total Products", { exact: true })).toBeVisible();
  await expect(page.getByText("20 total units", { exact: true })).toBeVisible();
  await expect(page.getByText("$500.00", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Top 5 Value Products" })).toBeVisible();
  await expect(page.locator(".recharts-wrapper > .recharts-surface")).toHaveCount(2);
  await page.request.post("/api/movements", { data: { productId: inventory.id, type: "sale", quantity: 2 } });
  await page.reload();
  await expect(page.getByText("18 total units", { exact: true })).toBeVisible();
  await expect(page.getByText("$450.00", { exact: true }).first()).toBeVisible();
});

test("low and out-of-stock alerts link to restock and clear after replenishment", async ({ page, inventory }) => {
  await page.request.put(`/api/products/${inventory.id}`, { data: { quantity: 0 } });
  await page.request.post("/api/products", { data: { ...productInput, sku: "LOW", name: "Low Stock Widget", quantity: 2 } });
  await page.goto("/alerts");
  await expect(page.getByRole("heading", { name: inventory.name, exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Low Stock Widget", exact: true })).toBeVisible();
  const card = page.locator("div.glass").filter({ has: page.getByRole("heading", { name: inventory.name, exact: true }) }).last();
  await card.getByRole("button", { name: "Restock", exact: true }).click();
  await expect(page).toHaveURL(`/movements/add?productId=${inventory.id}`);
  await page.locator('main form input[type="number"]').fill("10");
  await page.getByRole("button", { name: "Record Movement", exact: true }).click();
  await expect(page).toHaveURL("/movements");
  await page.goto("/alerts");
  await expect(page.getByRole("heading", { name: "Low Stock Widget", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: inventory.name, exact: true })).toHaveCount(0);
});

test("healthy alerts and empty inventory/movements states", async ({ page, inventory }) => {
  await page.goto("/alerts");
  await expect(page.getByRole("heading", { name: "All Items in Stock" })).toBeVisible();
  await page.goto("/movements");
  await expect(page.getByRole("heading", { name: "No Movements Yet" })).toBeVisible();
  await page.request.delete(`/api/products/${inventory.id}`);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "No Products Yet" })).toBeVisible();
  await page.goto("/movements/add");
  await expect(page.getByText("No products available. Create a product first.")).toBeVisible();
});

test("theme and stored warehouse/currency survive reload", async ({ page, inventory }) => {
  await page.goto(`/products/${inventory.id}`);
  const toggle = page.getByRole("button", { name: /Switch to .* mode/ });
  await expect(toggle).toBeEnabled();
  const toDark = (await toggle.getAttribute("aria-label"))?.includes("dark");
  await toggle.click();
  await expect(page.locator("html")).toHaveClass(toDark ? /dark/ : /light/);
  await page.evaluate(() => {
    localStorage.setItem("warehouse_name", "Stored Warehouse");
    localStorage.setItem("warehouse_currency", "INR");
  });
  await page.reload();
  await expect(page.locator("html")).toHaveClass(toDark ? /dark/ : /light/);
  await expect(page.getByRole("heading", { name: "Stored Warehouse" })).toBeVisible();
  await expect(page.getByText("Currency: INR", { exact: true })).toBeVisible();
  await expect(page.getByText("₹25.00", { exact: true }).first()).toBeVisible();
});

test("mobile navigation opens, navigates, and closes", async ({ page, inventory }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/products/${inventory.id}`);
  await page.getByRole("button", { name: "Toggle navigation menu" }).click();
  await page.getByRole("dialog").getByRole("link", { name: /Alerts/ }).click();
  await expect(page).toHaveURL("/alerts");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Inventory Alerts", exact: true })).toBeVisible();
});
