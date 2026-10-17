"use client";

import {
  AlertTriangle,
  Check,
  Minus,
  Plus,
  Search,
} from "lucide-react";
import { useMemo, useState } from "react";
import { StockBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MISSING_INFO } from "@/data/merchant";
import { ProductImage } from "@/features/catalog";
import { getAllProducts } from "@/lib/commerce/catalog";
import { formatNPR } from "@/lib/commerce/format";
import type { Product } from "@/lib/commerce/schemas";
import { useMerchantSession } from "@/store/useMerchantSession";

export function InventoryTab() {
  const stockOverrides = useMerchantSession((s) => s.stockOverrides);
  const setProductStock = useMerchantSession((s) => s.setProductStock);
  const liveMissing = useMerchantSession((s) => s.missing);

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [modalStockInput, setModalStockInput] = useState<number>(0);

  const allProducts = getAllProducts();

  // Compute live missing spec map
  const missingMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const m of MISSING_INFO) {
      const list = map.get(m.productId) ?? [];
      list.push(m.field);
      map.set(m.productId, list);
    }
    for (const m of liveMissing) {
      const list = map.get(m.productId) ?? [];
      if (!list.includes(m.field)) list.push(m.field);
      map.set(m.productId, list);
    }
    return map;
  }, [liveMissing]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return allProducts.filter((p) => {
      if (selectedCategory !== "all" && p.category !== selectedCategory) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allProducts, selectedCategory, search]);

  const handleAdjustStock = (productId: string, currentStock: number, delta: number) => {
    const effectiveStock = stockOverrides[productId] ?? currentStock;
    const next = Math.max(0, effectiveStock + delta);
    setProductStock(productId, next);
  };

  const handleOpenRestockModal = (product: Product) => {
    const current = stockOverrides[product.id] ?? product.stock;
    setEditingProduct(product);
    setModalStockInput(current);
  };

  const handleSaveModalStock = () => {
    if (editingProduct) {
      setProductStock(editingProduct.id, modalStockInput);
      setEditingProduct(null);
    }
  };

  const categories = [
    { id: "all", label: "All Items" },
    { id: "laptops", label: "Laptops" },
    { id: "phones", label: "Phones" },
    { id: "headphones", label: "Headphones" },
    { id: "accessories", label: "Accessories" },
  ];

  return (
    <div className="space-y-4">
      {/* Search and Category Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
            <Search className="size-4" aria-hidden="true" />
          </span>
          <Input
            type="search"
            placeholder="Search by product, brand, or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs"
            aria-label="Filter inventory products"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Category filter">
          {categories.map((c) => (
            <Button
              key={c.id}
              size="sm"
              variant={selectedCategory === c.id ? "primary" : "secondary"}
              onClick={() => setSelectedCategory(c.id)}
              className="text-xs"
            >
              {c.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Inventory Table Container */}
      <div className="overflow-hidden rounded-xl bg-surface/50 hairline">
        <div className="overflow-x-auto">
          <table
            className="w-full border-collapse text-left text-xs"
            aria-label="Catalog and Inventory Management"
          >
            <thead>
              <tr className="border-b border-border/60 bg-surface-2/60 text-muted">
                <th scope="col" className="p-3.5 font-medium uppercase tracking-wider text-2xs">
                  Product Details
                </th>
                <th scope="col" className="p-3.5 font-medium uppercase tracking-wider text-2xs">
                  Category
                </th>
                <th scope="col" className="p-3.5 font-medium uppercase tracking-wider text-2xs">
                  Unit Price (NPR)
                </th>
                <th scope="col" className="p-3.5 font-medium uppercase tracking-wider text-2xs">
                  Live Stock
                </th>
                <th scope="col" className="p-3.5 font-medium uppercase tracking-wider text-2xs">
                  Status
                </th>
                <th scope="col" className="p-3.5 font-medium uppercase tracking-wider text-2xs">
                  Pip Knowledge Gaps
                </th>
                <th scope="col" className="p-3.5 text-right font-medium uppercase tracking-wider text-2xs">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredProducts.map((p) => {
                const effectiveStock = stockOverrides[p.id] ?? p.stock;
                const gaps = missingMap.get(p.id) ?? [];

                return (
                  <tr key={p.id} className="transition-colors hover:bg-surface-2/30">
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <div className="relative size-10 shrink-0 overflow-hidden rounded-lg hairline">
                          <ProductImage product={p} view="front" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-text truncate max-w-48 sm:max-w-xs">{p.name}</p>
                          <p className="text-2xs text-muted">
                            {p.brand} · <span className="font-mono">{p.id}</span>
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span className="inline-flex items-center rounded-md bg-surface-2 px-2 py-0.5 text-2xs font-medium uppercase tracking-wider text-muted hairline">
                        {p.category}
                      </span>
                    </td>
                    <td className="p-3.5 whitespace-nowrap font-mono font-medium text-text">
                      {formatNPR(p.price)}
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleAdjustStock(p.id, p.stock, -1)}
                          disabled={effectiveStock <= 0}
                          className="grid size-6 place-items-center rounded bg-surface-2 text-text hover:bg-surface-2/80 disabled:opacity-30 disabled:pointer-events-none hairline"
                          aria-label={`Decrease stock for ${p.name}`}
                        >
                          <Minus className="size-3" aria-hidden="true" />
                        </button>
                        <span className="w-8 text-center font-mono font-semibold text-text">
                          {effectiveStock}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAdjustStock(p.id, p.stock, 1)}
                          className="grid size-6 place-items-center rounded bg-surface-2 text-text hover:bg-surface-2/80 hairline"
                          aria-label={`Increase stock for ${p.name}`}
                        >
                          <Plus className="size-3" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <StockBadge stock={effectiveStock} />
                    </td>
                    <td className="p-3.5">
                      {gaps.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {gaps.map((g) => (
                            <span
                              key={g}
                              className="inline-flex items-center gap-1 rounded bg-searching/15 px-1.5 py-0.5 text-2xs text-searching font-medium"
                              title="Shoppers asked Pip about this spec, but it is not listed in catalog"
                            >
                              <AlertTriangle className="size-2.5" aria-hidden="true" />
                              Missing: {g}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-2xs text-listening font-medium">
                          <Check className="size-3" aria-hidden="true" />
                          Specs complete
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-right whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleOpenRestockModal(p)}
                        className="text-xs"
                      >
                        Adjust Stock
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Restock Modal Dialog */}
      {editingProduct && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="restock-modal-title"
          className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <div className="w-full max-w-sm rounded-xl bg-surface p-5 shadow-xl hairline">
            <h3 id="restock-modal-title" className="font-display text-base font-semibold text-text">
              Adjust Inventory Stock
            </h3>
            <p className="mt-1 text-xs text-muted">
              Updating live stock buffer for <span className="font-medium text-text">{editingProduct.name}</span>.
            </p>

            <div className="mt-4">
              <label htmlFor="restock-input" className="block text-xs font-medium text-text mb-1">
                Stock Quantity (Units)
              </label>
              <Input
                id="restock-input"
                type="number"
                min="0"
                value={modalStockInput}
                onChange={(e) => setModalStockInput(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full text-sm font-mono"
              />
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setEditingProduct(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveModalStock}
              >
                Save Stock
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
