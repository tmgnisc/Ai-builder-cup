"use client";

import {
  AlertTriangle,
  Check,
  ChevronRight,
  Filter,
  GitCompareArrows,
  Loader2,
  Plus,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useId, useMemo, useRef, useState } from "react";
import { StockBadge } from "@/components/ui/Badge";
import { Button, buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { IconButton } from "@/components/ui/IconButton";
import { ProductImage } from "@/features/catalog";
import { cn } from "@/lib/cn";
import { getAllProducts, getProduct } from "@/lib/commerce/catalog";
import { compareProducts } from "@/lib/commerce/compare";
import { filterDifferentRows, isRowDifferent } from "@/lib/commerce/compareFilter";
import { buildCompareUrl } from "@/lib/commerce/compareUrl";
import { formatNPR } from "@/lib/commerce/format";
import type { Product } from "@/lib/commerce/schemas";
import { useCart } from "@/store/useCart";
import { useCatalogUI } from "@/store/useCatalogUI";
import { MAX_COMPARE, useCompare } from "@/store/useCompare";
import { useMerchantSession } from "@/store/useMerchantSession";
import { groupRowsBySection } from "./CompareSections";

const CATEGORY_NAMES: Record<string, string> = {
  laptops: "Laptops",
  phones: "Phones",
  headphones: "Headphones",
  accessories: "Accessories",
};

export interface CompareWorkspaceProps {
  initialValidIds: string[];
  initialDroppedUnknown?: string[];
  initialMessage?: string | null;
}

export function CompareWorkspace({
  initialValidIds,
  initialDroppedUnknown = [],
  initialMessage = null,
}: CompareWorkspaceProps) {
  const router = useRouter();
  const [ids, setIds] = useState<string[]>(initialValidIds);
  const remove = useCompare((s) => s.remove);
  const toggle = useCompare((s) => s.toggle);
  const context = useCompare((s) => s.context);
  const priorities = useCompare((s) => s.priorities);
  const catalogCategory = useCatalogUI((s) => s.filters.category);

  const [onlyDifferences, setOnlyDifferences] = useState(false);
  const [addingProductId, setAddingProductId] = useState<string>("");
  const diffSwitchId = useId();

  // Sync initialValidIds into local state and useCompare on mount / when URL changes
  useEffect(() => {
    setIds(initialValidIds);
    useCompare.setState({ ids: initialValidIds.slice(0, MAX_COMPARE), open: false });
  }, [initialValidIds]);

  // Subscribe to external changes (e.g. CompareTray)
  useEffect(() => {
    return useCompare.subscribe((state) => {
      setIds(state.ids);
    });
  }, []);

  // Resolve products from ids
  const products = useMemo(() => {
    return ids.map(getProduct).filter((p): p is Product => p !== undefined);
  }, [ids]);

  // Compute compare result
  const result = useMemo(() => {
    if (products.length < 2) return null;
    return compareProducts(products, {
      priorities: priorities ?? undefined,
      context: context ?? undefined,
    });
  }, [products, priorities, context]);

  // Cross-category detection & dominant category
  const categories = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.category)));
  }, [products]);
  const isCrossCategory = categories.length > 1;

  const dominantCategory = useMemo(() => {
    if (products.length === 0) return null;
    const counts = new Map<Product["category"], number>();
    for (const p of products) {
      counts.set(p.category, (counts.get(p.category) || 0) + 1);
    }
    let topCat: Product["category"] = products[0].category;
    let max = 0;
    for (const [cat, count] of counts.entries()) {
      if (count > max) {
        topCat = cat;
        max = count;
      }
    }
    return { category: topCat, count: max };
  }, [products]);

  // Row filtering and section grouping
  const allRows = useMemo(() => result?.rows ?? [], [result]);
  const diffRowCount = useMemo(() => allRows.filter(isRowDifferent).length, [allRows]);
  const visibleRows = useMemo(
    () => filterDifferentRows(allRows, onlyDifferences),
    [allRows, onlyDifferences],
  );
  const sections = useMemo(() => groupRowsBySection(visibleRows), [visibleRows]);

  // Emit missing_info events for merchant dashboard when specs are absent
  useEffect(() => {
    if (!result || products.length === 0) return;
    for (const row of allRows) {
      for (const p of products) {
        const val = row.values[p.id];
        if (!val || val === "—") {
          useMerchantSession.getState().recordMissingInfo({
            productId: p.id,
            field: row.key,
            question: `What is the ${row.label} specification for ${p.name}?`,
          });
        }
      }
    }
  }, [allRows, products, result]);

  // Quick-add suggestions for empty state or adding slots
  const allCatalog = useMemo(() => getAllProducts(), []);
  const availableToAdd = useMemo(() => {
    return allCatalog.filter((p) => !ids.includes(p.id));
  }, [allCatalog, ids]);

  const catalogHref = catalogCategory
    ? `/?category=${encodeURIComponent(catalogCategory)}#store`
    : "/#store";

  const handleRemove = (productId: string) => {
    const next = ids.filter((id) => id !== productId);
    setIds(next);
    remove(productId);
    if (next.length >= 2) {
      router.replace(buildCompareUrl(next), { scroll: false });
    } else if (next.length === 1) {
      router.replace(buildCompareUrl(next), { scroll: false });
    } else {
      router.replace("/compare", { scroll: false });
    }
  };

  const handleFilterToDominant = () => {
    if (!dominantCategory) return;
    const kept = products
      .filter((p) => p.category === dominantCategory.category)
      .map((p) => p.id);
    setIds(kept);
    useCompare.setState({ ids: kept, open: false });
    if (kept.length >= 2) {
      router.replace(buildCompareUrl(kept), { scroll: false });
    } else if (kept.length === 1) {
      router.replace(buildCompareUrl(kept), { scroll: false });
    } else {
      router.replace("/compare", { scroll: false });
    }
  };

  const handleQuickAdd = (productId: string) => {
    if (!productId || ids.includes(productId) || ids.length >= MAX_COMPARE) return;
    const next = [...ids, productId];
    setIds(next);
    toggle(productId);
    router.replace(buildCompareUrl(next), { scroll: false });
    setAddingProductId("");
  };

  // State: Error if invalid IDs were requested and no valid products remain
  if (products.length === 0 && initialDroppedUnknown.length > 0) {
    return (
      <div data-compare-workspace="true" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs sm:text-sm text-muted">
          <Link href={catalogHref} className="transition-colors hover:text-text">
            Catalog
          </Link>
          <ChevronRight className="size-3.5 text-muted/60" aria-hidden="true" />
          <span aria-current="page" className="font-medium text-text">
            Compare
          </span>
        </nav>
        <ErrorState
          title="Products not found"
          message={`The requested product IDs could not be found: ${initialDroppedUnknown.join(", ")}.`}
          extra={
            <Link href={catalogHref} className={buttonClasses({ variant: "secondary", size: "sm", className: "mt-4" })}>
              Return to Catalog
            </Link>
          }
        />
      </div>
    );
  }

  // State: Empty if fewer than 2 valid products are selected
  if (products.length < 2) {
    return (
      <div data-compare-workspace="true" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs sm:text-sm text-muted">
          <Link href={catalogHref} className="transition-colors hover:text-text">
            Catalog
          </Link>
          <ChevronRight className="size-3.5 text-muted/60" aria-hidden="true" />
          <span aria-current="page" className="font-medium text-text">
            Compare
          </span>
        </nav>

        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold tracking-tight text-text sm:text-3xl">
            Product Comparison
          </h1>
          <p className="mt-1 text-sm text-muted">
            Side-by-side spec comparison and live inventory
          </p>
        </div>

        <div className="rounded-2xl bg-surface/50 p-6 sm:p-10 hairline">
          <EmptyState
            icon={<GitCompareArrows className="size-6 text-muted" aria-hidden="true" />}
            title={
              products.length === 1
                ? "Pick one more product to compare"
                : "Select at least 2 products to compare"
            }
            description={
              products.length === 1
                ? `You have "${products[0].name}" selected. Add another product to compare specs side by side.`
                : "Select 2 to 4 products from the catalog to inspect technical specs, battery life, weight, and live stock."
            }
            action={
              <Link href={catalogHref} className={buttonClasses({ variant: "primary", size: "md" })}>
                Browse Catalog
              </Link>
            }
          />

          {/* Quick-add suggestions from catalog */}
          <div className="mt-8 border-t border-border/40 pt-6">
            <h2 className="font-display text-xs font-semibold uppercase tracking-wider text-muted">
              Suggested products to compare
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {availableToAdd.slice(0, 4).map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col justify-between rounded-xl bg-surface-2/40 p-3.5 hairline"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-12 shrink-0 overflow-hidden rounded-lg hairline">
                      <ProductImage product={p} variant="suggested" showInitials={false} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-text">{p.name}</p>
                      <p className="text-2xs text-muted">{formatNPR(p.price)}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleQuickAdd(p.id)}
                    className="mt-3 w-full"
                    aria-label={`Add ${p.name} to comparison`}
                  >
                    <Plus className="size-3.5" aria-hidden="true" />
                    Add to compare
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active workspace with 2-4 products
  return (
    <div
      data-compare-workspace="true"
      className="mx-auto max-w-7xl px-4 py-8 pb-32 sm:px-6 sm:pb-20 lg:px-8"
    >
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-2 text-xs sm:text-sm text-muted">
        <Link href={catalogHref} className="transition-colors hover:text-text">
          Catalog
        </Link>
        <ChevronRight className="size-3.5 text-muted/60" aria-hidden="true" />
        <span aria-current="page" className="font-medium text-text">
          Compare ({products.length})
        </span>
      </nav>

      {/* Page Title */}
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-text sm:text-3xl">
            Product Comparison
          </h1>
          <p className="mt-1 text-sm text-muted">
            Side-by-side spec comparison and live inventory
          </p>
        </div>
      </div>

      {/* Unrecognized IDs notice if any were dropped */}
      {(initialDroppedUnknown.length > 0 || initialMessage) && (
        <div
          role="status"
          className="mb-4 flex items-center gap-3 rounded-xl bg-surface-2/80 p-3.5 text-xs text-muted hairline"
        >
          <AlertTriangle className="size-4 shrink-0 text-searching" aria-hidden="true" />
          <p>
            {initialMessage ?? (
              <>
                Unrecognized product {initialDroppedUnknown.length > 1 ? "IDs were" : "ID was"}{" "}
                dropped: <span className="font-mono text-text">{initialDroppedUnknown.join(", ")}</span>. Showing comparison for valid products.
              </>
            )}
          </p>
        </div>
      )}

      {/* Cross-Category Warning Banner */}
      {isCrossCategory && dominantCategory && (
        <div
          role="alert"
          className="mb-6 flex flex-col gap-3 rounded-2xl bg-surface-2 p-4 sm:flex-row sm:items-center sm:justify-between hairline"
        >
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="grid size-8 shrink-0 place-items-center rounded-full bg-searching/15 text-searching"
            >
              <Filter className="size-4" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-searching">
                Cross-Category Comparison
              </p>
              <p className="mt-0.5 text-sm text-muted">
                Comparing across different categories (
                {categories.map((c) => CATEGORY_NAMES[c] ?? c).join(", ")}). Direct specs comparison
                may not be meaningful.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleFilterToDominant}
            className="self-start whitespace-nowrap sm:self-center"
          >
            Keep only {CATEGORY_NAMES[dominantCategory.category] ?? dominantCategory.category} ({dominantCategory.count})
          </Button>
        </div>
      )}

      {/* Summary Panel: Pip's Catalog-Grounded Analysis & Live Stock */}
      {result && (
        <div data-compare-summary="true" className="mb-6 rounded-2xl bg-surface-2/60 p-5 hairline">
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-bg shadow-[inset_0_0_0_1.5px_var(--accent),0_0_16px_-4px_var(--accent)]"
            >
              <Sparkles className="size-3.5 text-accent-text" />
            </span>
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-accent-text">
                Pip&apos;s analysis
              </p>
              <p className="mt-1 text-sm leading-relaxed text-text">
                {result.verdict}
              </p>

              {/* Live stock status per product */}
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border/40 pt-3 text-xs text-muted">
                <span className="font-semibold uppercase tracking-wider text-2xs text-muted">
                  Live Stock:
                </span>
                {products.map((p) => {
                  const stockText = p.stock > 0 ? `In stock (${p.stock} units)` : "Out of stock";
                  return (
                    <span
                      key={p.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-surface/70 px-2.5 py-1 hairline"
                    >
                      <span className="font-medium text-text">{p.name}:</span>
                      <span className="text-xs text-text">{stockText}</span>
                      <StockBadge stock={p.stock} className="shrink-0" />
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Workspace Controls Bar */}
      <div data-compare-controls="true" className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Differences-only switch */}
          <div className="flex items-center gap-2">
            <button
              id={diffSwitchId}
              type="button"
              role="switch"
              aria-checked={onlyDifferences}
              onClick={() => setOnlyDifferences((prev) => !prev)}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors",
                onlyDifferences ? "bg-accent" : "bg-surface-2 border border-border-strong",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "pointer-events-none inline-block size-5 rounded-full bg-bg shadow-sm transition-transform",
                  onlyDifferences ? "translate-x-5" : "translate-x-0.5 mt-0.5",
                )}
              />
            </button>
            <label htmlFor={diffSwitchId} className="cursor-pointer text-xs font-medium text-text select-none">
              Show differences only
            </label>
          </div>

          {/* Screen reader live announcement */}
          <div data-diff-announcement="true" aria-live="polite" className="sr-only">
            {onlyDifferences
              ? `Filtered to ${diffRowCount} differing attributes`
              : `Showing all ${allRows.length} attributes`}
          </div>

          <span className="text-xs text-muted">
            ({diffRowCount} differing spec{diffRowCount === 1 ? "" : "s"})
          </span>
        </div>

        {/* Quick-add slot when under max limit */}
        {products.length < MAX_COMPARE && availableToAdd.length > 0 && (
          <div className="flex items-center gap-2">
            <select
              aria-label="Add another product to compare"
              value={addingProductId}
              onChange={(e) => {
                const val = e.target.value;
                if (val) handleQuickAdd(val);
              }}
              className="h-8 rounded-full border border-border-strong bg-surface px-3 text-xs text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <option value="">+ Add product ({products.length}/{MAX_COMPARE})</option>
              {availableToAdd.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.brand} {p.name} ({formatNPR(p.price)})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Semantic Comparison Table */}
      <div
        data-compare-table="true"
        className="relative overflow-x-auto rounded-2xl bg-surface/50 shadow-sm hairline snap-x snap-mandatory"
      >
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">
            Side-by-side product comparison of {products.map((p) => p.name).join(", ")}
          </caption>

          {/* Sticky Product Header */}
          <thead
            data-compare-header="true"
            className="sticky top-0 z-sticky bg-surface/95 backdrop-blur shadow-sm"
          >
            <tr className="border-b border-border/60">
              <th
                scope="col"
                className="sticky left-0 z-20 w-36 min-w-32 bg-surface/95 backdrop-blur hairline-r p-4 align-bottom sm:w-48 sm:min-w-44"
              >
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Specification
                </span>
              </th>

              {products.map((p) => {
                const isWinner = result?.winnerId === p.id;

                return (
                  <th
                    key={p.id}
                    scope="col"
                    className="snap-start min-w-44 p-4 align-top sm:min-w-56"
                  >
                    <div className="flex flex-col gap-2">
                      {/* Product Thumbnail with Winner badge & Remove */}
                      <div className="relative h-28 w-full overflow-hidden rounded-xl hairline">
                        <ProductImage product={p} variant="compare-workspace" />
                        {isWinner && (
                          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-2xs font-semibold text-accent-fg shadow-sm">
                            <Trophy className="size-3" aria-hidden="true" />
                            Better fit
                          </span>
                        )}
                        <IconButton
                          size="sm"
                          variant="secondary"
                          onClick={() => handleRemove(p.id)}
                          aria-label={`Remove ${p.brand} ${p.name} from comparison`}
                          className="absolute right-2 top-2 size-7 bg-black/45 text-white backdrop-blur hover:bg-black/65"
                        >
                          <X className="size-3.5" aria-hidden="true" />
                        </IconButton>
                      </div>

                      {/* Brand & Wrapping Product Title */}
                      <div className="min-w-0">
                        <p className="text-2xs uppercase tracking-wider text-muted">{p.brand}</p>
                        <Link
                          href={`/product/${p.id}`}
                          className="font-display text-sm font-semibold text-text hover:underline break-words"
                        >
                          {p.name}
                        </Link>
                      </div>

                      {/* Price & Single-Line Stock Badge */}
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <span className="font-mono text-sm font-semibold text-text">
                          {formatNPR(p.price)}
                        </span>
                        <StockBadge stock={p.stock} className="shrink-0 whitespace-nowrap" />
                      </div>

                      {/* Verified Add to Cart Button */}
                      <CompareAddToCartButton product={p} />
                    </div>
                  </th>
                );
              })}

              {/* Add column placeholder if room */}
              {products.length < MAX_COMPARE && availableToAdd.length > 0 && (
                <th
                  scope="col"
                  className="hidden min-w-44 border-l border-dashed border-border/40 p-4 align-middle sm:table-cell"
                >
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 p-4 text-center">
                    <Plus className="size-6 text-muted/60" aria-hidden="true" />
                    <p className="mt-1 text-xs font-medium text-text">Slot available</p>
                    <p className="mt-0.5 text-2xs text-muted">Up to {MAX_COMPARE} products</p>
                  </div>
                </th>
              )}
            </tr>
          </thead>

          {/* Grouped Table Body */}
          <tbody>
            {sections.length === 0 ? (
              <tr>
                <td
                  colSpan={products.length + 1}
                  className="p-8 text-center text-sm text-muted"
                >
                  No differing specifications between the selected products.
                </td>
              </tr>
            ) : (
              sections.map((section) => (
                <Fragment key={`section-${section.id}`}>
                  {/* Section Divider Header */}
                  <tr className="bg-surface-2/60">
                    <th
                      scope="colgroup"
                      colSpan={products.length + (products.length < MAX_COMPARE && availableToAdd.length > 0 ? 2 : 1)}
                      className="sticky left-0 px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-muted"
                    >
                      {section.title}
                    </th>
                  </tr>

                  {/* Section Spec Rows */}
                  {section.rows.map((row) => (
                    <tr
                      key={row.key}
                      className="border-b border-border/40 transition-colors hover:bg-surface-2/20"
                    >
                      <th
                        scope="row"
                        className="sticky left-0 z-10 w-36 min-w-32 bg-surface/95 backdrop-blur hairline-r px-4 py-3 align-middle text-xs font-medium text-muted sm:w-48 sm:min-w-44 sm:text-sm"
                      >
                        {row.label}
                      </th>

                      {products.map((p) => {
                        const isWin = row.winners.includes(p.id);
                        const val = row.values[p.id] ?? "—";

                        return (
                          <td
                            key={p.id}
                            className={cn(
                              "snap-start min-w-44 px-4 py-3 align-middle font-mono text-xs sm:text-sm sm:min-w-56 transition-colors",
                              isWin
                                ? "bg-accent/8 font-semibold text-accent-text shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--accent)_20%,transparent)]"
                                : "text-text",
                              !row.numeric && "font-sans text-xs text-muted",
                            )}
                          >
                            <span className="break-words">{val}</span>
                            {isWin && (
                              <span className="ml-1.5 inline-flex items-center gap-0.5 align-middle">
                                <Check className="size-3 text-accent-text" aria-hidden="true" />
                                <span className="sr-only"> (best value)</span>
                              </span>
                            )}
                          </td>
                        );
                      })}

                      {/* Spacer cell for add column if active */}
                      {products.length < MAX_COMPARE && availableToAdd.length > 0 && (
                        <td className="hidden border-l border-dashed border-border/40 p-4 sm:table-cell" />
                      )}
                    </tr>
                  ))}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface CompareAddToCartButtonProps {
  product: Product;
}

function CompareAddToCartButton({ product }: CompareAddToCartButtonProps) {
  const addWithFeedback = useCart((s) => s.addWithFeedback);
  const pending = useCart((s) => s.pending.includes(product.id));
  const isOutOfStock = product.stock === 0;

  const [status, setStatus] = useState<"idle" | "busy" | "verified" | "failed">("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = async () => {
    if (isOutOfStock || pending || status === "busy") return;
    setStatus("busy");
    setErrorMsg("");
    try {
      const ok = await addWithFeedback(product.id, buttonRef.current);
      if (ok) {
        setStatus("verified");
        setTimeout(() => setStatus("idle"), 2500);
      } else {
        setStatus("failed");
        setErrorMsg("Store accepted it, but could not verify item in cart.");
        setTimeout(() => setStatus("idle"), 3000);
      }
    } catch (err: unknown) {
      setStatus("failed");
      setErrorMsg(err instanceof Error ? err.message : "Store service unavailable.");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  const busy = pending || status === "busy";

  return (
    <div className="mt-1 flex flex-col gap-1">
      <Button
        ref={buttonRef}
        size="sm"
        variant={status === "verified" ? "secondary" : "primary"}
        disabled={isOutOfStock || busy}
        onClick={handleClick}
        className={cn(
          "w-full transition-all",
          status === "verified" && "border-accent text-accent-text bg-accent/15 hover:bg-accent/20",
          status === "failed" && "border-destructive text-destructive bg-destructive/10 hover:bg-destructive/15",
        )}
        aria-label={
          isOutOfStock
            ? `Add to cart: ${product.name} (out of stock)`
            : status === "verified"
            ? `${product.name}: added and verified`
            : status === "failed"
            ? `${product.name}: addition failed, could not verify`
            : `Add to cart: ${product.name} (${formatNPR(product.price)})`
        }
      >
        {busy ? (
          <>
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            <span>Adding…</span>
          </>
        ) : status === "verified" ? (
          <>
            <Check className="size-3.5 text-accent-text" aria-hidden="true" />
            <span>Added & verified ✓</span>
          </>
        ) : status === "failed" ? (
          <>
            <X className="size-3.5 text-destructive" aria-hidden="true" />
            <span>Failed to verify</span>
          </>
        ) : (
          <>
            <Plus className="size-3.5" aria-hidden="true" />
            <span>Add to cart</span>
          </>
        )}
      </Button>
      <span aria-live="polite" className="sr-only">
        {status === "verified"
          ? `Added ${product.name} to cart, stock confirmed and verified`
          : status === "failed"
          ? `Failed to verify adding ${product.name} to cart. ${errorMsg}`
          : ""}
      </span>
    </div>
  );
}
