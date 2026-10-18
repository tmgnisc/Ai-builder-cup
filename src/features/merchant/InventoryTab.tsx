"use client";

import { AlertTriangle, Minus, PackageSearch, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge, StockBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ProductImage } from "@/features/catalog";
import { cn } from "@/lib/cn";
import { getAllProducts } from "@/lib/commerce/catalog";
import { formatNPR } from "@/lib/commerce/format";
import type { Product } from "@/lib/commerce/schemas";
import { useCatalogUI } from "@/store/useCatalogUI";
import { useMerchantSession } from "@/store/useMerchantSession";
import { AddProductModal } from "./AddProductModal";

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "laptops", label: "Laptops" },
  { id: "phones", label: "Phones" },
  { id: "headphones", label: "Headphones" },
  { id: "accessories", label: "Accessories" },
  { id: "clothing", label: "Clothing" },
];

export function InventoryTab() {
  const inventory = useMerchantSession((s) => s.inventory);
  const inventoryState = useMerchantSession((s) => s.inventoryState);
  const loadInventory = useMerchantSession((s) => s.loadInventory);
  const stockOverrides = useMerchantSession((s) => s.stockOverrides);
  const setProductStock = useMerchantSession((s) => s.setProductStock);
  const analytics = useMerchantSession((s) => s.analytics);
  const loadAnalytics = useMerchantSession((s) => s.loadAnalytics);

  const catalogProducts = useCatalogUI((s) => s.catalogProducts);
  const setCatalogProducts = useCatalogUI((s) => s.setCatalogProducts);
  const loadCatalog = useCatalogUI((s) => s.loadCatalogFromApi);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [editing, setEditing] = useState<Product | null>(null);
  const [stockInput, setStockInput] = useState(0);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    void loadInventory();
    void loadCatalog();
    if (!analytics) void loadAnalytics();
  }, [loadInventory, loadCatalog, loadAnalytics, analytics]);

  const allProducts = catalogProducts.length > 0 ? catalogProducts : getAllProducts();
  const stockOf = (p: Product) => stockOverrides[p.id] ?? inventory?.[p.id] ?? p.stock;

  const gapsByProduct = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const m of analytics?.missingInfo ?? []) map.set(m.productId, [...(map.get(m.productId) ?? []), m.field]);
    return map;
  }, [analytics]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allProducts.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      return !q || p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
    });
  }, [allProducts, category, search]);

  const saveStock = async (p: Product, next: number) => {
    setNotice(null);
    if (!(await setProductStock(p.id, next))) setNotice(`Couldn't save stock for ${p.name}. Nothing was changed; try again.`);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const p = deleting;
    setDeleting(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(p.id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error(String(res.status));
      setCatalogProducts(allProducts.filter((x) => x.id !== p.id));
      void loadInventory();
    } catch {
      setNotice(`Couldn't remove ${p.name}. It's still listed.`);
    }
  };

  const low = allProducts.filter((p) => stockOf(p) > 0 && stockOf(p) <= 3).length;
  const out = allProducts.filter((p) => stockOf(p) === 0).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
        <span>{allProducts.length} products</span>
        {low > 0 && <Badge tone="warning">{low} low stock</Badge>}
        {out > 0 && <Badge tone="danger">{out} out of stock</Badge>}
        {inventoryState === "error" && <Badge tone="danger">Live stock unavailable, showing catalog stock</Badge>}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input type="search" placeholder="Product, brand or SKU" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" aria-label="Search products" />
        </div>
        <div className="flex items-center gap-2">
          <div className="no-scrollbar flex gap-1 overflow-x-auto rounded-xl bg-surface p-1 hairline" role="group" aria-label="Filter by category">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={category === c.id}
                onClick={() => setCategory(c.id)}
                className={cn("shrink-0 rounded-lg px-3 py-1.5 text-xs transition-colors", category === c.id ? "bg-surface-2 font-medium text-text hairline" : "text-muted hover:text-text")}
              >
                {c.label}
              </button>
            ))}
          </div>
          <Button size="sm" variant="primary" onClick={() => setAddOpen(true)} iconLeft={<Plus className="size-3.5" aria-hidden />} className="shrink-0">
            Add product
          </Button>
        </div>
      </div>

      {notice && (
        <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger hairline">
          {notice}
        </p>
      )}

      {filtered.length === 0 ? (
        <EmptyState icon={<PackageSearch className="size-6" />} title="No matching products" description="Try another category or search term." />
      ) : (
        <div className="overflow-hidden rounded-card bg-surface hairline">
          <div className="overflow-x-auto">
            <table className="w-full min-w-table border-collapse text-left text-sm">
              <caption className="sr-only">Inventory</caption>
              <thead>
                <tr className="border-b border-border text-xs text-muted">
                  <th scope="col" className="px-4 py-3 font-medium">Product</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Price</th>
                  <th scope="col" className="px-4 py-3 font-medium">Stock</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status</th>
                  <th scope="col" className="px-4 py-3 font-medium">Shoppers asked for</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((p) => {
                  const stock = stockOf(p);
                  const gaps = gapsByProduct.get(p.id) ?? [];
                  return (
                    <tr key={p.id} className="transition-colors hover:bg-surface-2/40">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative size-10 shrink-0 overflow-hidden rounded-lg hairline">
                            <ProductImage product={p} view="front" showInitials={false} />
                          </div>
                          <div className="min-w-0">
                            <p className="max-w-64 truncate font-medium" title={p.name}>
                              {p.name}
                            </p>
                            <p className="text-xs capitalize text-muted">
                              {p.brand} · {p.category}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular">{formatNPR(p.price)}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex items-center gap-1">
                          <IconButton size="sm" variant="ghost" className="size-7" onClick={() => void saveStock(p, stock - 1)} disabled={stock <= 0} aria-label={`Decrease stock for ${p.name}`}>
                            <Minus className="size-3.5" />
                          </IconButton>
                          <button
                            type="button"
                            onClick={() => {
                              setEditing(p);
                              setStockInput(stock);
                            }}
                            className="min-w-9 rounded-md px-1.5 py-1 text-center font-medium tabular hover:bg-surface-2"
                            aria-label={`Set stock for ${p.name}, currently ${stock}`}
                          >
                            {stock}
                          </button>
                          <IconButton size="sm" variant="ghost" className="size-7" onClick={() => void saveStock(p, stock + 1)} aria-label={`Increase stock for ${p.name}`}>
                            <Plus className="size-3.5" />
                          </IconButton>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <StockBadge stock={stock} />
                      </td>
                      <td className="max-w-56 px-4 py-3">
                        {gaps.length ? (
                          <div className="flex flex-wrap gap-1">
                            {gaps.map((g) => (
                              <Badge key={g} tone="info" title="Shoppers asked Pip for this, but the listing doesn't include it">
                                <AlertTriangle className="size-3" aria-hidden />
                                {g}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted">–</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <IconButton size="sm" variant="ghost" className="size-8 text-muted hover:text-danger" onClick={() => setDeleting(p)} aria-label={`Remove ${p.name}`}>
                          <Trash2 className="size-4" />
                        </IconButton>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        title="Set stock"
        description={editing ? editing.name : undefined}
        footer={
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                if (editing) void saveStock(editing, stockInput);
                setEditing(null);
              }}
            >
              Save
            </Button>
          </div>
        }
      >
        <label htmlFor="stock-input" className="mb-1.5 block text-sm text-muted">
          Units in stock
        </label>
        <Input id="stock-input" type="number" min={0} inputMode="numeric" value={stockInput} onChange={(e) => setStockInput(Math.max(0, parseInt(e.target.value, 10) || 0))} className="tabular" />
      </Modal>

      <Modal
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Remove product?"
        description={deleting ? `${deleting.name} will disappear from the store. Existing orders aren't affected.` : undefined}
        footer={
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setDeleting(null)}>
              Keep it
            </Button>
            <Button size="sm" variant="danger" onClick={() => void confirmDelete()}>
              Remove
            </Button>
          </div>
        }
      >
        <span />
      </Modal>

      <AddProductModal
        isOpen={addOpen}
        onClose={() => {
          setAddOpen(false);
          void loadInventory();
        }}
      />
    </div>
  );
}
