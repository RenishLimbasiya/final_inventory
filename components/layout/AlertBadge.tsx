"use client";

import { useEffect, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "@/hooks/useRedux";
import { cn } from "@/lib/utils";
import { fetchProducts } from "@/store/productSlice";

interface AlertBadgeProps {
  className?: string;
}

/**
 * AlertBadge Component
 * Displays count badge of low-stock and out-of-stock items
 * Updates reactively based on Redux product state
 */
export function AlertBadge({ className }: AlertBadgeProps) {
  const dispatch = useAppDispatch();
  const products = useAppSelector((state) => state.products.products);
  const productStatus = useAppSelector((state) => state.products.status);

  useEffect(() => {
    if (productStatus === "idle" && products.length === 0) {
      dispatch(fetchProducts(undefined));
    }
  }, [dispatch, productStatus, products.length]);

  const alertCount = useMemo(() => {
    return products.filter(
      (product) => product.quantity === 0 || product.quantity <= product.minStockLevel,
    ).length;
  }, [products]);

  if (alertCount === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "inline-flex items-center justify-center",
        "h-6 w-6 rounded-full",
        "bg-red-500 text-white",
        "text-xs font-bold",
        "animate-pulse",
        className,
      )}
    >
      {alertCount}
    </div>
  );
}
