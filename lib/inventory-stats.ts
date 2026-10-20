import type { InventoryStats, Product } from "@/types/inventory";

export function getInventoryStats(
  products: Product[],
  lowStockThresholdOverride: number | null = null,
): InventoryStats {
  const activeProducts = products.filter((product) => product.isActive !== false);
  const byCategory: InventoryStats["byCategory"] = {
    electronics: 0,
    clothing: 0,
    food: 0,
    furniture: 0,
    tools: 0,
    stationery: 0,
    other: 0,
  };
  for (const product of activeProducts) {
    byCategory[product.category] += 1;
  }
  return {
    totalProducts: activeProducts.length,
    totalValue: activeProducts.reduce((sum, p) => sum + p.price * p.quantity, 0),
    lowStockCount: activeProducts.filter(
      (p) => p.quantity > 0 && p.quantity <= (lowStockThresholdOverride ?? p.minStockLevel),
    ).length,
    outOfStockCount: activeProducts.filter((p) => p.quantity === 0).length,
    byCategory,
    topByValue: [...activeProducts]
      .sort((a, b) => b.price * b.quantity - a.price * a.quantity)
      .slice(0, 5),
  };
}
