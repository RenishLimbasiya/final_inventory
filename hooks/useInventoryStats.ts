"use client";

import { useMemo } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { InventoryStats } from "@/types/inventory";
import { getInventoryStats } from "@/lib/inventory-stats";
import { useWarehouse } from "@/context/WarehouseContext";

/**
 * Hook: useInventoryStats
 * Computes inventory statistics from Redux state only
 * No API fetches - uses current Redux state
 * Returns live computed stats
 */
export function useInventoryStats(): InventoryStats {
  const products = useSelector((state: RootState) => state.products.products);
  const { lowStockThresholdOverride } = useWarehouse();

  return useMemo(
    () => getInventoryStats(products, lowStockThresholdOverride),
    [products, lowStockThresholdOverride],
  );
}
