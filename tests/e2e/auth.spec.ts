import { test, expect } from "@playwright/test";

for (const path of ["/", "/dashboard", "/products", "/products/add", "/products/missing", "/movements", "/movements/add", "/alerts"]) {
  test(`anonymous page access redirects: ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(`/login\\?redirect=${encodeURIComponent(path)}`));
    await expect(page.getByRole("button", { name: "Enter Dashboard" })).toBeVisible();
  });
}
for (const path of ["/api/products", "/api/products/missing", "/api/movements", "/api/movements/stats", "/api/admin/logs"]) {
  test(`anonymous API access is denied: ${path}`, async ({ request }) => {
    const response = await request.get(path);
    expect(response.status()).toBe(401);
    expect(await response.json()).toMatchObject({ success: false });
  });
}
test("login preserves destination and warehouse name; logout revokes access", async ({ page }) => {
  await page.goto("/products?category=tools");
  await page.getByLabel("Warehouse Name").fill("Test Warehouse");
  await page.getByRole("button", { name: "Enter Dashboard" }).click();
  await expect(page).toHaveURL(/\/products\?category=tools$/);
  await expect(page.getByRole("heading", { name: "Test Warehouse" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Test Warehouse" })).toBeVisible();
  const cookie = (await page.context().cookies()).find((c) => c.name === "inventory_token");
  expect(cookie?.httpOnly).toBe(true);
  expect((await page.request.delete("/api/auth/login")).ok()).toBeTruthy();
  await page.goto("/products");
  await expect(page).toHaveURL(/\/login\?/);
});
test("default login and unsafe redirect fallback", async ({ page }) => {
  await page.goto("/login?redirect=https://example.com");
  await page.getByRole("button", { name: "Enter Dashboard" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "Default Warehouse" })).toBeVisible();
  await page.goto("/dashboard");
  await expect(page).toHaveURL("/");
});
test("failed login can be retried", async ({ page }) => {
  await page.route("**/api/auth/login", (route) => route.fulfill({ status: 500, json: { error: "Unavailable" } }));
  await page.goto("/login");
  await page.getByRole("button", { name: "Enter Dashboard" }).click();
  await expect(page.getByText("Login failed")).toBeVisible();
  await expect(page.getByRole("button", { name: "Enter Dashboard" })).toBeEnabled();
});
