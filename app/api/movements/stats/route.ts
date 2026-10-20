import { NextResponse } from "next/server";
import { getInventoryStats } from "@/lib/inventory-stats";
import { getProducts, initializeDatabase } from "@/lib/db";

/**
 * GET /api/movements/stats
 * Compute inventory statistics
 *
 * Returns a typed InventoryStats object.
 */
export async function GET() {
  try {
    initializeDatabase();
    const stats = getInventoryStats(getProducts());

    return NextResponse.json({ data: stats, success: true });
  } catch (error) {
    console.error("GET /api/movements/stats error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
