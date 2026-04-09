"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAppDispatch } from "@/hooks/useRedux";
import { setFilters } from "@/store/productSlice";

export function ProductFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();

  /**
   * Update URL + Redux together
   */
  const updateFilter = (key: string, value: string | boolean) => {
    const params = new URLSearchParams(searchParams.toString());

    if (!value || value === "all") {
      params.delete(key);
    } else {
      params.set(key, String(value));
    }

    const queryString = params.toString();
    router.replace(queryString ? `/products?${queryString}` : "/products");

    dispatch(
      setFilters({
        [key]: value,
      }),
    );
  };

  return (
    <div className="glass rounded-lg p-4 border border-white/10 space-y-4">
      <h3 className="font-semibold">Filters</h3>

      {/* Search */}
      <Input
        placeholder="Search products..."
        value={searchParams.get("search") ?? ""}
        onChange={(e) => updateFilter("search", e.target.value)}
      />

      {/* Category */}
      <select
        className="w-full rounded-md bg-background border px-3 py-2 text-foreground"
        value={searchParams.get("category") ?? "all"}
        onChange={(e) => updateFilter("category", e.target.value)}
      >
        <option value="all" className="bg-background text-foreground">
          All Categories
        </option>
        <option value="electronics" className="bg-background text-foreground">
          Electronics
        </option>
        <option value="furniture" className="bg-background text-foreground">
          Furniture
        </option>
        <option value="food" className="bg-background text-foreground">
          Food
        </option>
        <option value="clothing" className="bg-background text-foreground">
          Clothing
        </option>
        <option value="tools" className="bg-background text-foreground">
          Tools
        </option>
        <option value="stationery" className="bg-background text-foreground">
          Stationery
        </option>
        <option value="other" className="bg-background text-foreground">
          Other
        </option>
      </select>

      {/* Price Range */}
      <div className="flex gap-2">
        <Input
          type="number"
          placeholder="Min Price"
          value={searchParams.get("minPrice") ?? ""}
          onChange={(e) => updateFilter("minPrice", e.target.value)}
        />

        <Input
          type="number"
          placeholder="Max Price"
          value={searchParams.get("maxPrice") ?? ""}
          onChange={(e) => updateFilter("maxPrice", e.target.value)}
        />
      </div>

      {/* Low Stock */}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={searchParams.get("lowStockOnly") === "true"}
          onChange={(e) => updateFilter("lowStockOnly", e.target.checked)}
        />
        Low Stock Only
      </label>

      {/* Reset */}
      <Button variant="outline" onClick={() => router.replace("/products")}>
        Reset Filters
      </Button>
    </div>
  );
}
