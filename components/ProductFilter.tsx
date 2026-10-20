"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAppDispatch } from "@/hooks/useRedux";
import { setFilters } from "@/store/productSlice";

const DEBOUNCE_MS = 350;
const TEXT_FILTERS = ["search", "minPrice", "maxPrice"] as const;
type TextFilter = (typeof TEXT_FILTERS)[number];

function readTextFilters(query: string) {
  const params = new URLSearchParams(query);
  return {
    search: params.get("search") ?? "",
    minPrice: params.get("minPrice") ?? "",
    maxPrice: params.get("maxPrice") ?? "",
  };
}

export function ProductFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const query = searchParams.toString();
  const [draft, setDraft] = useState(() => ({ query, values: readTextFilters(query) }));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<Partial<Record<TextFilter, string>>>({});

  // Restore URL-driven values on navigation without discarding newer typing
  // while an earlier debounced navigation is still completing.
  if (draft.query !== query) {
    const previous = readTextFilters(draft.query);
    const incoming = readTextFilters(query);
    setDraft({
      query,
      values: Object.fromEntries(TEXT_FILTERS.map((key) => [
        key, draft.values[key] === previous[key] ? incoming[key] : draft.values[key],
      ])) as typeof incoming,
    });
  }

  useEffect(() => {
    const cancelPending = () => {
      if (timer.current !== null) clearTimeout(timer.current);
      pending.current = {};
    };
    const restoreFromHistory = () => {
      cancelPending();
      const restored = new URLSearchParams(window.location.search).toString();
      setDraft({ query: restored, values: readTextFilters(restored) });
    };
    window.addEventListener("popstate", restoreFromHistory);
    return () => {
      cancelPending();
      window.removeEventListener("popstate", restoreFromHistory);
    };
  }, []);

  /**
   * Update URL + Redux together
   */
  const updateFilter = (key: string, value: string | boolean) => {
    if (timer.current !== null) clearTimeout(timer.current);
    const changes: Record<string, string | boolean> = { ...pending.current, [key]: value };
    pending.current = {};
    const params = new URLSearchParams(window.location.search);

    for (const [filter, nextValue] of Object.entries(changes)) {
      if (!nextValue || nextValue === "all") {
        params.delete(filter);
      } else {
        params.set(filter, String(nextValue));
      }
    }

    const queryString = params.toString();
    router.replace(queryString ? `/products?${queryString}` : "/products", { scroll: false });

    dispatch(
      setFilters({
        ...changes,
        minPrice: params.get("minPrice") ? Number(params.get("minPrice")) : null,
        maxPrice: params.get("maxPrice") ? Number(params.get("maxPrice")) : null,
      }),
    );
  };

  const debounceFilter = (key: TextFilter, value: string) => {
    setDraft((current) => ({ ...current, values: { ...current.values, [key]: value } }));
    pending.current[key] = value;
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(() => updateFilter(key, value), DEBOUNCE_MS);
  };

  return (
    <div className="glass rounded-lg p-4 border border-white/10 space-y-4">
      <h3 className="font-semibold">Filters</h3>

      {/* Search */}
      <Input
        placeholder="Search products..."
        value={draft.values.search}
        onChange={(e) => debounceFilter("search", e.target.value)}
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
          value={draft.values.minPrice}
          onChange={(e) => debounceFilter("minPrice", e.target.value)}
        />

        <Input
          type="number"
          placeholder="Max Price"
          value={draft.values.maxPrice}
          onChange={(e) => debounceFilter("maxPrice", e.target.value)}
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
      {/* A native GET navigation clears every query parameter, including after
          a reload, without depending on a cached client router transition. */}
      <form action="/products" method="get" onSubmit={() => {
        if (timer.current !== null) clearTimeout(timer.current);
        pending.current = {};
      }}>
        <Button type="submit" variant="outline">
          Reset Filters
        </Button>
      </form>
    </div>
  );
}
