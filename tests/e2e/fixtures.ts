import { test as base, expect } from "@playwright/test";
import type { Product } from "../../types/inventory";

export const productInput = {
  sku: "E2E-001", name: "E2E Widget", description: "Browser test product",
  category: "tools", price: 2500, costPrice: 1000, quantity: 20,
  minStockLevel: 5, maxStockLevel: 100, unit: "pieces", supplier: "E2E Supplier", isActive: true,
};

export const test = base.extend<{ inventory: Product }>({
  inventory: async ({ page }, provideInventory) => {
    const request = page.request;
    expect((await request.post("/api/auth/login", { data: { warehouseName: "E2E Warehouse" } })).ok()).toBeTruthy();
    const list = await request.get("/api/products?isActive=false");
    expect(list.ok()).toBeTruthy();
    for (const product of (await list.json()).data) {
      expect((await request.delete(`/api/products/${product.id}`)).ok()).toBeTruthy();
    }
    const created = await request.post("/api/products", { data: productInput });
    expect(created.status()).toBe(201);
    await provideInventory((await created.json()).data);
  },
});
export { expect };
