"use client";

import { useMemo, useState } from "react";

import { MovementHistoryRow } from "@/components/MovementHistoryRow";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Product, StockMovement } from "@/types/inventory";

interface PaginatedMovementListProps {
  movements: StockMovement[];
  products: Product[];
  pageSize?: number;
  emptyTitle: string;
  emptyDescription: string;
  emptyIcon?: string;
  className?: string;
}

export function PaginatedMovementList({
  movements,
  products,
  pageSize = 10,
  emptyTitle,
  emptyDescription,
  emptyIcon = "📊",
  className,
}: PaginatedMovementListProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const productMap = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  const totalPages = Math.max(1, Math.ceil(movements.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const visibleMovements = movements.slice(startIndex, startIndex + pageSize);

  if (movements.length === 0) {
    return (
      <div
        className={cn(
          "glass rounded-lg p-12",
          "border border-white/10",
          "flex flex-col items-center justify-center gap-4",
          "text-center",
          className,
        )}
      >
        <div className="text-4xl">{emptyIcon}</div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">{emptyTitle}</h3>
          <p className="text-sm text-muted-foreground mt-2">
            {emptyDescription}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-3">
        {visibleMovements.map((movement) => (
          <MovementHistoryRow
            key={movement.id}
            movement={movement}
            productName={
              productMap.get(movement.productId)?.name || "Unknown Product"
            }
          />
        ))}
      </div>

      <div className="glass rounded-lg border border-white/10 px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {startIndex + 1}-
            {Math.min(startIndex + pageSize, movements.length)} of{" "}
            {movements.length} movements
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={safeCurrentPage === 1}
            >
              Previous
            </Button>
            <span className="min-w-20 text-center text-sm text-foreground">
              Page {safeCurrentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage((page) => Math.min(totalPages, page + 1))
              }
              disabled={safeCurrentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
