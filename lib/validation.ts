const categories = ["electronics", "clothing", "food", "furniture", "tools", "stationery", "other"];
const textFields = ["sku", "name", "description", "unit", "supplier", "imageUrl"];
const numericFields = ["price", "costPrice", "quantity", "minStockLevel", "maxStockLevel"];
const allowedFields = new Set([...textFields, ...numericFields, "category", "isActive"]);

export function validateProductInput(value: unknown, partial = false): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "Expected a JSON object";
  const data = value as Record<string, unknown>;
  if (Object.keys(data).some((key) => !allowedFields.has(key))) return "Unknown or read-only product field";
  if (!partial) {
    for (const key of ["sku", "name", "price", "costPrice", "quantity", "minStockLevel"]) {
      if (data[key] === undefined) return `${key} is required`;
    }
  }
  for (const key of textFields) {
    if (data[key] !== undefined && typeof data[key] !== "string") return `${key} must be a string`;
  }
  for (const key of ["sku", "name", "unit"]) {
    if (typeof data[key] === "string" && !(data[key] as string).trim()) return `${key} cannot be empty`;
  }
  if (typeof data.name === "string" && data.name.trim().length < 2) return "Name must be at least 2 characters long";
  for (const key of numericFields) {
    if (data[key] === undefined) continue;
    const number = data[key];
    const minimum = key === "price" || key === "costPrice" ? 1 : 0;
    if (typeof number !== "number" || !Number.isSafeInteger(number) || number < minimum) {
      return `${key} must be a safe integer greater than or equal to ${minimum}`;
    }
  }
  if (data.category !== undefined && !categories.includes(data.category as string)) return "Invalid product category";
  if (data.isActive !== undefined && typeof data.isActive !== "boolean") return "isActive must be a boolean";
  return null;
}
