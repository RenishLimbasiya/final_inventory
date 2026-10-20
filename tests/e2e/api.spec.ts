import { test, expect, productInput } from "./fixtures";

test("product API rejects duplicates, invalid input, malformed JSON and missing IDs", async ({ page, inventory }) => {
  const request = page.request;
  expect((await request.post("/api/products", { data: productInput })).status()).toBe(400);
  for (const data of [{ ...productInput, sku: "NEW", quantity: -1 }, { ...productInput, sku: "NEW", price: 1.5 }, { ...productInput, sku: "NEW", category: "invalid" }]) {
    expect((await request.post("/api/products", { data })).status()).toBe(400);
  }
  expect((await request.post("/api/products", { data: "{", headers: { "Content-Type": "application/json" } })).status()).toBe(400);
  expect((await request.put(`/api/products/${inventory.id}`, { data: { quantity: -1 } })).status()).toBe(400);
  expect((await request.get("/api/products/does-not-exist")).status()).toBe(404);
  expect((await request.put("/api/products/does-not-exist", { data: { name: "Missing" } })).status()).toBe(404);
  expect((await request.delete("/api/products/does-not-exist")).status()).toBe(404);
});

test("movement validation is atomic; filters, limits, stats and logs work", async ({ page, inventory }) => {
  const request = page.request;
  for (const data of [null, { productId: inventory.id, type: "invalid", quantity: 1 }, { productId: inventory.id, type: "sale", quantity: 21 }, { productId: inventory.id, type: "restock", quantity: 0 }, { productId: inventory.id, type: "restock", quantity: 1.5 }, { productId: "missing", type: "sale", quantity: 1 }, { productId: inventory.id, type: "return", quantity: 1, note: 123 }]) {
    expect((await request.post("/api/movements", { data })).status()).toBe(400);
  }
  expect((await (await request.get(`/api/products/${inventory.id}`)).json()).data.quantity).toBe(20);
  expect((await (await request.get("/api/movements")).json()).data).toEqual([]);
  for (const type of ["restock", "sale", "return", "adjustment"]) {
    const response = await request.post("/api/movements", { data: { productId: inventory.id, type, quantity: 2 } });
    expect(response.status()).toBe(201);
    expect((await response.json()).data).toMatchObject({ productId: inventory.id, type, quantity: 2 });
  }
  const filtered = (await (await request.get(`/api/movements?productId=${inventory.id}&type=sale&limit=1`)).json()).data;
  expect(filtered).toHaveLength(1);
  expect(filtered[0].type).toBe("sale");
  expect((await (await request.get("/api/movements/stats")).json()).data).toMatchObject({ totalProducts: 1, totalValue: 50000, lowStockCount: 0, outOfStockCount: 0 });
  const logs = await request.get("/api/admin/logs?path=/api/products&method=GET&authenticated=true&minutes=5");
  expect(logs.ok()).toBeTruthy();
  const body = await logs.json();
  expect(body.success).toBe(true);
  expect(Array.isArray(body.logs)).toBe(true);
  for (const log of body.logs) expect(log).toMatchObject({ method: "GET", authenticated: true });
});

test("sorting, inactive products and combined filters", async ({ page, inventory }) => {
  const request = page.request;
  expect((await request.post("/api/products", { data: { ...productInput, sku: "CHEAP", name: "Cheap Tool", price: 500, quantity: 1 } })).status()).toBe(201);
  let data = (await (await request.get("/api/products?sortBy=price&sortOrder=desc")).json()).data;
  expect(data.map((p: { price: number }) => p.price)).toEqual([2500, 500]);
  data = (await (await request.get("/api/products?category=tools&minPrice=1&maxPrice=10&lowStock=true&search=CHEAP")).json()).data;
  expect(data).toHaveLength(1);
  expect(data[0].sku).toBe("CHEAP");
  expect((await request.put(`/api/products/${inventory.id}`, { data: { isActive: false } })).ok()).toBeTruthy();
  expect((await (await request.get("/api/products")).json()).data).toHaveLength(1);
  expect((await (await request.get("/api/products?isActive=false")).json()).data).toHaveLength(2);
});
