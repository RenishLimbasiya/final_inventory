import { test, expect } from "./fixtures";

for (const [type, expected] of [["restock", 23], ["sale", 17], ["return", 23], ["adjustment", 17]] as const) {
  test(`${type} updates stock and product history through the browser`, async ({ page, inventory }) => {
    await page.goto(`/products/${inventory.id}`);
    const form = page.locator("main form");
    await form.locator("select").selectOption(type);
    await form.locator('input[type="number"]').fill("3");
    await form.getByPlaceholder("Additional details...").fill(`E2E ${type} note`);
    await expect(form).toContainText("Stock Preview");
    await expect(form.locator("p").filter({ hasText: new RegExp(`^${expected}$`) })).toBeVisible();
    const saved = page.waitForResponse((r) => r.url().endsWith("/api/movements") && r.request().method() === "POST");
    await form.getByRole("button", { name: "Record Movement" }).click();
    expect((await saved).status()).toBe(201);
    await expect(page.getByText(`E2E ${type} note`, { exact: true })).toBeVisible();
    await page.reload();
    expect((await (await page.request.get(`/api/products/${inventory.id}`)).json()).data.quantity).toBe(expected);
    await expect(page.getByText(`E2E ${type} note`, { exact: true })).toBeVisible();
  });
}

test("negative inventory is blocked; failed movement keeps stock unchanged", async ({ page, inventory }) => {
  await page.goto(`/products/${inventory.id}`);
  const form = page.locator("main form");
  await form.locator("select").selectOption("sale");
  await form.locator('input[type="number"]').fill("21");
  await expect(form.getByText(/would exceed available stock/)).toBeVisible();
  await expect(form.getByRole("button", { name: "Record Movement" })).toBeDisabled();
  await form.locator('input[type="number"]').fill("2");
  await page.route("**/api/movements", (route) => route.fulfill({ status: 500, json: { error: "E2E movement failure" } }));
  await form.getByRole("button", { name: "Record Movement" }).click();
  await expect(form.getByText(/E2E movement failure|Failed to record/)).toBeVisible();
  expect((await (await page.request.get(`/api/products/${inventory.id}`)).json()).data.quantity).toBe(20);
});

test("select/change product and record from dedicated movement page", async ({ page, inventory }) => {
  await page.goto("/movements/add");
  await page.getByRole("button", { name: new RegExp(inventory.name) }).click();
  await page.getByRole("button", { name: "Change Product" }).click();
  await expect(page.getByRole("heading", { name: "Select a Product" })).toBeVisible();
  await page.getByRole("button", { name: new RegExp(inventory.name) }).click();
  await page.locator('main form input[type="number"]').fill("2");
  await page.getByPlaceholder("Additional details...").fill("Dedicated page movement");
  await page.getByRole("button", { name: "Record Movement", exact: true }).click();
  await expect(page).toHaveURL("/movements");
  await expect(page.getByText("Dedicated page movement")).toBeVisible();
});

test("history product filter, pagination, and dashboard recent pagination", async ({ page, inventory }) => {
  for (let index = 1; index <= 12; index++) {
    expect((await page.request.post("/api/movements", { data: { productId: inventory.id, type: "restock", quantity: 1, note: `History note ${index}` } })).status()).toBe(201);
  }
  await page.goto("/products");
  await page.getByRole("button", { name: "History", exact: true }).click();
  await expect(page).toHaveURL(`/movements?productId=${inventory.id}`);
  await expect(page.getByText("Page 1 of 2", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Previous" })).toBeDisabled();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Showing 11-12 of 12 movements")).toBeVisible();
  await expect(page.getByRole("button", { name: "Next", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Previous" }).click();
  await expect(page.getByText("Page 1 of 2", { exact: true })).toBeVisible();
  await page.goto("/");
  await expect(page.getByText("Page 1 of 3", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Page 2 of 3", { exact: true })).toBeVisible();
});
