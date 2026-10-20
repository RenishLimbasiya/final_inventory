import { Product, StockMovement } from "@/types/inventory";
import { StatsCard } from "@/components/StatsCard";
import { CategoryDistributionChart } from "@/components/CategoryDistributionChart";
import { TopValueChart } from "@/components/TopValueChart";
import { LowStockAlert } from "@/components/LowStockAlert";
import { PaginatedMovementList } from "@/components/PaginatedMovementList";
import { cn } from "@/lib/utils";
import { getProducts, getMovements, initializeDatabase } from "@/lib/db";
import { getInventoryStats } from "@/lib/inventory-stats";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Dashboard Page (Server Component)
 * Fetches and displays inventory statistics and charts
 * Server-side rendering for optimal performance
 */
export default async function DashboardPage() {
  let products: Product[] = [];
  let movements: StockMovement[] = [];
  let error: string | null = null;

  try {
    initializeDatabase();
    products = getProducts().filter((product) => product.isActive !== false);
    movements = getMovements();
  } catch (err) {
    error =
      err instanceof Error ? err.message : "Failed to fetch dashboard data";
  }

  const displayStats = getInventoryStats(products);

  const lowStockCount = displayStats.outOfStockCount + displayStats.lowStockCount;

  return (
    <div className="space-y-6">
      {/* Error Message */}
      {error && (
        <div
          className={cn(
            "glass rounded-lg p-4",
            "border border-red-500/30 bg-red-500/10",
            "text-red-700 dark:text-red-300",
            "text-sm",
          )}
        >
          <p className="font-medium">⚠️ {error}</p>
        </div>
      )}

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          icon="📦"
          label="Total Products"
          value={displayStats.totalProducts}
          subtext={`${products.reduce((sum, p) => sum + p.quantity, 0)} total units`}
        />
        <StatsCard
          icon="💰"
          label="Total Value"
          value={`$${(displayStats.totalValue / 100).toFixed(2)}`}
          subtext="Inventory worth"
        />
        <StatsCard
          icon="⚠️"
          label="Low Stock"
          value={displayStats.lowStockCount}
          variant={displayStats.lowStockCount > 0 ? "warning" : "success"}
          subtext="Below minimum level"
        />
        <StatsCard
          icon="🚨"
          label="Out of Stock"
          value={displayStats.outOfStockCount}
          variant={displayStats.outOfStockCount > 0 ? "danger" : "success"}
          subtext="Zero quantity items"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryDistributionChart products={products} />
        <TopValueChart products={products} />
      </div>

      {/* Low Stock Alerts */}
      {lowStockCount > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">
            ⚠️ Inventory Alerts
          </h2>
          <LowStockAlert variant="detailed" products={products} />
        </div>
      )}

      {/* Recent Movements */}
      {movements.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">
            📊 Recent Movements
          </h2>
          <PaginatedMovementList
            movements={movements}
            products={products}
            pageSize={5}
            emptyTitle="No Recent Movements"
            emptyDescription="Record your first stock movement to see recent activity."
          />
        </div>
      )}

      {/* Empty State */}
      {products.length === 0 && !error && (
        <div
          className={cn(
            "glass rounded-lg p-12",
            "border border-white/10",
            "flex flex-col items-center justify-center gap-4",
            "text-center",
          )}
        >
          <div className="text-4xl">📦</div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              No Products Yet
            </h3>
            <p className="text-sm text-muted-foreground mt-2">
              Add your first product to see inventory statistics
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
