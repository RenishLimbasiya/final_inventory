import { Product } from "@/types/inventory";
import { StockMovementRecordForm } from "@/components/StockMovementRecordForm";
import { getProducts, initializeDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Movements Add Page (Server Component)
 * Wrapper for recording new stock movements
 * Fetches products to populate form selection
 */
export default async function RecordMovementPage({
  searchParams,
}: {
  searchParams: Promise<{ productId?: string }>;
}) {
  let products: Product[] = [];
  let error: string | null = null;
  const { productId } = await searchParams;

  try {
    initializeDatabase();
    products = getProducts().filter((product) => product.isActive !== false);
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to fetch products";
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-foreground">Record Movement</h1>
        <p className="text-muted-foreground">
          Record a stock movement transaction (inbound, outbound, adjustment,
          return)
        </p>
      </div>

      {/* Form */}
      <StockMovementRecordForm
        products={products}
        error={error}
        initialProductId={productId}
      />
    </div>
  );
}
