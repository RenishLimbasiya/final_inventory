/**
 * Demo database module.
 * Uses file persistence locally and falls back to memory-only mode in production/serverless.
 * In production, replace with a real database (PostgreSQL, MongoDB, Vercel Postgres, etc.)
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { Product, StockMovement, StockMovementType } from "@/types/inventory";

interface DatabaseState {
  products: Map<string, Product>;
  movements: Map<string, StockMovement>;
  counters: {
    productId: number;
    movementId: number;
  };
}

interface SerializedDatabaseState {
  products: Product[];
  movements: StockMovement[];
  counters: {
    productId: number;
    movementId: number;
  };
}

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "inventory-db.json");
const isProduction = process.env.NODE_ENV === "production";
const persistenceMode =
  process.env.INVENTORY_PERSISTENCE_MODE ||
  (isProduction ? "memory" : "file");

/**
 * In-memory cache backed by a JSON file
 */
const db: DatabaseState = {
  products: new Map<string, Product>(),
  movements: new Map<string, StockMovement>(),
  counters: {
    productId: 1,
    movementId: 1,
  },
};

function getSeedProducts(now: string): Product[] {
  return [
    {
      id: "prod_1",
      sku: "SKU-001",
      name: "Laptop Computer",
      description: "High-performance laptop",
      category: "electronics",
      price: 129999,
      costPrice: 99999,
      quantity: 15,
      minStockLevel: 5,
      maxStockLevel: 30,
      unit: "pcs",
      supplier: "Tech Supplier Inc",
      createdAt: now,
      updatedAt: now,
      isActive: true,
    },
    {
      id: "prod_2",
      sku: "SKU-002",
      name: "Office Chair",
      description: "Ergonomic office chair",
      category: "furniture",
      price: 29999,
      costPrice: 19999,
      quantity: 3,
      minStockLevel: 10,
      maxStockLevel: 50,
      unit: "pcs",
      supplier: "Furniture Ltd",
      createdAt: now,
      updatedAt: now,
      isActive: true,
    },
  ];
}

function serializeDatabase(): SerializedDatabaseState {
  return {
    products: Array.from(db.products.values()),
    movements: Array.from(db.movements.values()),
    counters: db.counters,
  };
}

function saveDatabase(): void {
  if (persistenceMode !== "file") {
    return;
  }

  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }

  writeFileSync(
    DATA_FILE,
    JSON.stringify(serializeDatabase(), null, 2),
    "utf8",
  );
}

function hydrateDatabase(data: SerializedDatabaseState): void {
  db.products = new Map(data.products.map((product) => [product.id, product]));
  db.movements = new Map(
    data.movements.map((movement) => [movement.id, movement]),
  );
  db.counters = data.counters;
}

/**
 * Initialize with sample data
 */
export function initializeDatabase() {
  if (persistenceMode === "file" && existsSync(DATA_FILE)) {
    const persisted = JSON.parse(
      readFileSync(DATA_FILE, "utf8"),
    ) as SerializedDatabaseState;

    hydrateDatabase(persisted);
    return;
  }

  if (db.products.size === 0) {
    const now = new Date().toISOString();
    const products = getSeedProducts(now);
    db.products = new Map(products.map((product) => [product.id, product]));
    db.movements = new Map();

    db.counters.productId = 3;
    db.counters.movementId = 1;
    saveDatabase();
  }
}

/**
 * Get all products
 */
export function getProducts(): Product[] {
  return Array.from(db.products.values());
}

/**
 * Get product by ID
 */
export function getProductById(id: string): Product | undefined {
  return db.products.get(id);
}

/**
 * Create product
 */
export function createProduct(
  data: Omit<Product, "id" | "createdAt" | "updatedAt">,
): Product {
  const now = new Date().toISOString();
  const product: Product = {
    ...data,
    id: `prod_${db.counters.productId++}`,
    createdAt: now,
    updatedAt: now,
  };
  db.products.set(product.id, product);
  saveDatabase();
  return product;
}

/**
 * Update product
 */
export function updateProduct(
  id: string,
  data: Partial<Product>,
): Product | null {
  const product = db.products.get(id);
  if (!product) return null;

  const updated: Product = {
    ...product,
    ...data,
    id: product.id,
    createdAt: product.createdAt,
    updatedAt: new Date().toISOString(),
  };
  db.products.set(id, updated);
  saveDatabase();
  return updated;
}

/**
 * Delete product
 */
export function deleteProduct(id: string): boolean {
  const exists = db.products.has(id);
  if (exists) {
    db.products.delete(id);
    // Cascade delete movements
    deleteMovementsByProductId(id);
    saveDatabase();
  }
  return exists;
}

/**
 * Get all movements
 */
/**
 * Get all movements with optional filtering
 * Supports: { productId, type, limit }
 * Sorted by performedAt descending
 */
export function getMovements(filters?: {
  productId?: string;
  type?: StockMovementType;
  limit?: number;
}): StockMovement[] {
  let result = Array.from(db.movements.values());
  if (filters) {
    if (filters.productId) {
      result = result.filter((m) => m.productId === filters.productId);
    }
    if (filters.type) {
      result = result.filter((m) => m.type === filters.type);
    }
  }
  result.sort(
    (a, b) =>
      new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime(),
  );
  if (filters?.limit) {
    result = result.slice(0, filters.limit);
  }
  return result;
}

/**
 * Create movement (atomic operation with product update)
 */
export function createMovement(data: {
  productId: string;
  type: StockMovementType;
  quantity: number;
  note?: string;
}): StockMovement | null {
  const product = db.products.get(data.productId);
  if (!product) return null;

  let newQuantity = product.quantity;
  const previousQuantity = product.quantity;
  switch (data.type) {
    case "restock":
    case "return":
      newQuantity = previousQuantity + data.quantity;
      break;
    case "sale":
    case "adjustment":
      newQuantity = previousQuantity - data.quantity;
      break;
  }
  // Never allow negative stock
  if (newQuantity < 0) {
    return null;
  }
  // Atomic update
  const now = new Date().toISOString();
  const updatedProduct: Product = {
    ...product,
    quantity: newQuantity,
    updatedAt: now,
  };
  db.products.set(product.id, updatedProduct);

  const movement: StockMovement = {
    id: `mov_${db.counters.movementId++}`,
    productId: data.productId,
    type: data.type,
    quantity: data.quantity,
    previousQuantity,
    newQuantity,
    note: data.note,
    performedAt: now,
  };
  db.movements.set(movement.id, movement);
  saveDatabase();
  return movement;
}

/**
 * Delete movements by product ID (cascade delete)
 */
export function deleteMovementsByProductId(productId: string): void {
  const toDelete: string[] = [];
  for (const [id, movement] of db.movements) {
    if (movement.productId === productId) {
      toDelete.push(id);
    }
  }
  toDelete.forEach((id) => db.movements.delete(id));
  saveDatabase();
}

/**
 * Export database instance (for debugging)
 */
export { db };
