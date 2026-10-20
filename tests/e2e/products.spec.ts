import { test, expect, productInput } from "./fixtures";

test("typing is debounced and pending filters are combined", async ({ page, inventory }) => {
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  await page.goto("/products");
  await expect(page.getByRole("heading", { name: inventory.name })).toBeVisible();
  await page.clock.pauseAt(new Date("2026-01-02T00:00:00Z"));
  const searches: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname === "/api/products" && url.searchParams.has("search")) searches.push(url.search);
  });

  await page.getByPlaceholder("Search products...").fill("E");
  await page.clock.runFor(200);
  await page.getByPlaceholder("Search products...").fill("E2E");
  await expect(page.getByPlaceholder("Search products...")).toHaveValue("E2E");
  await page.clock.runFor(349);
  expect(searches).toEqual([]);
  await expect(page).toHaveURL("/products");
  await page.clock.runFor(1);
  await expect(page).toHaveURL(/search=E2E/);
  await expect.poll(() => searches.length).toBe(1);

  await page.getByPlaceholder("Min Price").fill("10");
  await page.getByPlaceholder("Max Price").fill("30");
  await page.clock.runFor(350);
  await expect(page).toHaveURL((url) => url.searchParams.get("minPrice") === "10" && url.searchParams.get("maxPrice") === "30" && url.searchParams.get("search") === "E2E");

  await page.getByPlaceholder("Search products...").fill("Widget");
  await page.locator("main select").selectOption("tools");
  await expect(page).toHaveURL((url) => url.searchParams.get("category") === "tools" && url.searchParams.get("search") === "Widget" && url.searchParams.get("minPrice") === "10" && url.searchParams.get("maxPrice") === "30");
  await page.clock.runFor(500);
  await expect(page.getByPlaceholder("Search products...")).toHaveValue("Widget");
});

test("create, read, edit, cancel, delete and cascade movement history", async ({ page, inventory }) => {
  await page.goto("/products/add");
  const fields = { ...productInput, sku: "E2E-NEW", name: "New Browser Product", category: "other" };
  for (const key of ["sku", "name", "description", "price", "costPrice", "quantity", "minStockLevel", "maxStockLevel", "supplier"] as const) {
    await page.locator(`#${key}`).fill(String(fields[key]));
  }
  await page.locator("#category").selectOption("electronics");
  await page.locator("#unit").selectOption("boxes");
  await page.getByRole("button", { name: "Create Product" }).click();
  await expect(page).toHaveURL("/products");
  await page.getByRole("heading", { name: fields.name }).click();
  await expect(page).toHaveURL(/\/products\/prod_\d+$/);
  await expect(page.getByRole("heading", { name: fields.name })).toBeVisible();
  const id = page.url().split("/").pop();
  await page.getByRole("button", { name: "Edit Product" }).click();
  await page.locator("#name").fill("Cancelled edit");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("heading", { name: fields.name })).toBeVisible();
  await page.getByRole("button", { name: "Edit Product" }).click();
  await page.locator("#name").fill("Updated Browser Product");
  await page.locator("#price").fill("3500");
  await page.getByRole("button", { name: "Save Changes" }).click();
  await expect(page.getByRole("heading", { name: "Updated Browser Product" })).toBeVisible();
  const updated = await page.request.get(`/api/products/${id}`);
  expect(updated.status()).toBe(200);
  expect((await updated.json()).data.price).toBe(3500);
  expect((await page.request.post("/api/movements", { data: { productId: id, type: "restock", quantity: 1 } })).status()).toBe(201);
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("heading", { name: "Updated Browser Product" })).toBeVisible();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("button", { name: "Delete Product", exact: true }).click();
  await expect(page).toHaveURL("/products");
  expect((await page.request.get(`/api/products/${id}`)).status()).toBe(404);
  expect((await (await page.request.get(`/api/movements?productId=${id}`)).json()).data).toEqual([]);
  expect((await page.request.get(`/api/products/${inventory.id}`)).ok()).toBeTruthy();
});

test("search, category, price, low stock, reset, URL state and empty results", async ({ page, inventory }) => {
  const resetFilters = async () => {
    const reset = page.getByRole("button", { name: "Reset Filters" });
    await reset.click();
    await expect(page).toHaveURL((url) => url.pathname === "/products" && url.search === "");
    await expect(page.getByPlaceholder("Search products...")).toHaveValue("");
    await expect(page.locator("main select")).toHaveValue("all");
    await expect(page.getByPlaceholder("Min Price")).toHaveValue("");
    await expect(page.getByPlaceholder("Max Price")).toHaveValue("");
    await expect(page.getByRole("heading", { name: inventory.name })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Budget Chair" })).toBeVisible();
  };
  expect((await page.request.post("/api/products", { data: { ...productInput, sku: "SECOND", name: "Budget Chair", category: "furniture", quantity: 1, price: 500 } })).status()).toBe(201);
  await page.goto("/products");
  await expect(page.getByRole("heading", { name: inventory.name })).toBeVisible();
  await page.getByPlaceholder("Search products...").fill("E2E-001");
  await expect(page).toHaveURL(/search=E2E-001/);
  await expect(page.getByRole("heading", { name: "Budget Chair" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: inventory.name })).toBeVisible();
  await resetFilters();
  await page.locator("main select").selectOption("furniture");
  await expect(page.getByRole("heading", { name: "Budget Chair" })).toBeVisible();
  await expect(page.getByRole("heading", { name: inventory.name })).toHaveCount(0);
  await page.reload();
  await expect(page.locator("main select")).toHaveValue("furniture");
  // The server renders filter controls before client handlers are hydrated.
  // Product cards appear only after the client fetch has completed.
  await expect(page.getByRole("heading", { name: "Budget Chair" })).toBeVisible();
  await resetFilters();
  await page.getByPlaceholder("Min Price").fill("10");
  await expect(page.getByRole("heading", { name: "Budget Chair" })).toHaveCount(0);
  await page.getByPlaceholder("Max Price").fill("20");
  await expect(page.getByRole("heading", { name: "No Products Found" })).toBeVisible();
  await resetFilters();
  await page.getByLabel("Low Stock Only").click();
  await expect(page.getByLabel("Low Stock Only")).toBeChecked();
  await expect(page.getByRole("heading", { name: "Budget Chair" })).toBeVisible();
  await expect(page.getByRole("heading", { name: inventory.name })).toHaveCount(0);
});

test("create validation and failed save preserve entered data", async ({ page, inventory }) => {
  await page.goto("/products/add");
  // Disable native validation to exercise the application's validation messages.
  await page.locator("main form").evaluate((form) => (form as HTMLFormElement).noValidate = true);
  await page.getByRole("button", { name: "Create Product" }).click();
  await expect(page.getByText("SKU is required", { exact: true })).toBeVisible();
  for (const key of ["sku", "name", "price", "costPrice", "quantity", "minStockLevel", "maxStockLevel"] as const) {
    await page.locator(`#${key}`).fill(String(productInput[key]));
  }
  await page.locator("#maxStockLevel").fill("1");
  await page.getByRole("button", { name: "Create Product" }).click();
  await expect(page.getByText("Max stock level must be greater than or equal to min stock level", { exact: true })).toBeVisible();
  await page.locator("#maxStockLevel").fill("100");
  await page.route("**/api/products", (route) => route.fulfill({ status: 500, json: { success: false, error: "E2E save failure" } }));
  await page.getByRole("button", { name: "Create Product" }).click();
  await expect(page.getByRole("button", { name: "Create Product" })).toBeEnabled();
  await expect(page.locator("#name")).toHaveValue(inventory.name);
  await expect(page).toHaveURL("/products/add");
  await expect(page.getByText(/E2E save failure|Failed to create product/)).toBeVisible();
});

test("missing product and failed product listing show errors", async ({ page, inventory }) => {
  await page.goto(`/products/missing-${inventory.id}`);
  await expect(page.getByText("Product not found", { exact: true })).toBeVisible();
  await page.route(/\/api\/products\??$/, (route) => route.fulfill({ status: 500, json: { error: "E2E list failure" } }));
  await page.goto("/products");
  await expect(page.getByText(/HTTP error! status: 500/)).toBeVisible();
});
