import { NextRequest, NextResponse } from "next/server";
import { getMovements, createMovement, initializeDatabase } from "@/lib/db";

/**
 * GET /api/movements
 * Returns StockMovement[]
 * Supports ?productId=... , ?type=restock , ?limit=50
 * Sorted by performedAt descending
 */
export async function GET(request: NextRequest) {
  try {
    initializeDatabase();
    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get("productId") || undefined;
    const type = searchParams.get("type") || undefined;
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!)
      : undefined;

    const movements = getMovements({
      productId,
      type:
        type === "restock" ||
        type === "sale" ||
        type === "adjustment" ||
        type === "return"
          ? type
          : undefined,
      limit,
    });
    // Already sorted by performedAt descending in db util
    return NextResponse.json({ data: movements, success: true });
  } catch (error) {
    console.error("GET /api/movements error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/movements
 * Accepts { productId, type, quantity, note? }
 * Validates: productId must exist; quantity must be a positive integer; for "sale" and "adjustment" (negative), the resulting quantity must not go below 0.
 * Server computes previousQuantity and newQuantity, updates the product's quantity atomically, and generates id and performedAt.
 * Returns the created StockMovement with status 201.
 */
export async function POST(request: NextRequest) {
  try {
    initializeDatabase();
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { success: false, error: "Expected a JSON object" },
        { status: 400 },
      );
    }
    if (body.note !== undefined && typeof body.note !== "string") {
      return NextResponse.json(
        { success: false, error: "note must be a string" },
        { status: 400 },
      );
    }
    const { productId, type, quantity, note } = body as {
      productId: string;
      type: "restock" | "sale" | "adjustment" | "return";
      quantity: number;
      note?: string;
    };

    // Validation
    if (!productId || typeof productId !== "string") {
      return NextResponse.json(
        { success: false, error: "productId is required" },
        { status: 400 },
      );
    }
    if (!["restock", "sale", "adjustment", "return"].includes(type)) {
      return NextResponse.json(
        { success: false, error: "Invalid movement type" },
        { status: 400 },
      );
    }
    if (
      typeof quantity !== "number" ||
      quantity <= 0 ||
      !Number.isSafeInteger(quantity)
    ) {
      return NextResponse.json(
        { success: false, error: "Quantity must be a positive integer" },
        { status: 400 },
      );
    }

    // Create movement (atomic operation)
    try {
      const movement = createMovement({ productId, type, quantity, note });
      if (!movement) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Failed to record movement. Product not found or would result in negative inventory.",
          },
          { status: 400 },
        );
      }
      return NextResponse.json(
        { data: movement, success: true },
        { status: 201 },
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Movement error";
      return NextResponse.json(
        { success: false, error: message },
        { status: 400 },
      );
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 },
      );
    }
    console.error("POST /api/movements error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
