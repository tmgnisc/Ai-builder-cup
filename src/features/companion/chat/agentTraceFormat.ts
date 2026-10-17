import {
  PackageCheck,
  PackageSearch,
  Scale,
  LayoutGrid,
  Search,
  ShoppingCart,
  Trash2,
  Truck,
  type LucideIcon,
} from "lucide-react";

export const TOOL_ICONS: Record<string, LucideIcon> = {
  search_products: Search,
  get_product: PackageSearch,
  compare_products: Scale,
  check_stock: PackageCheck,
  get_delivery_info: Truck,
  add_to_cart: ShoppingCart,
  remove_from_cart: Trash2,
  get_cart: ShoppingCart,
  ui_action: LayoutGrid,
};

const RUNNING_LABELS: Record<string, string> = {
  search_products: "Searching catalog",
  get_product: "Checking product details",
  compare_products: "Comparing specifications",
  check_stock: "Checking inventory",
  get_delivery_info: "Checking delivery options",
  add_to_cart: "Adding to cart",
  remove_from_cart: "Updating cart",
  get_cart: "Verifying cart",
  ui_action: "Updating display",
};

const COMPLETED_LABELS: Record<string, string> = {
  search_products: "Searched catalog",
  get_product: "Checked product details",
  compare_products: "Compared specifications",
  check_stock: "Checked inventory",
  get_delivery_info: "Checked delivery",
  add_to_cart: "Added to cart",
  remove_from_cart: "Updated cart",
  get_cart: "Verified cart",
  ui_action: "Updated display",
};

/**
 * Returns a human-friendly activity label for shoppers, never exposing
 * raw internal backend tool names or snake_case identifiers.
 */
export function formatToolLabel(name: string, status?: "running" | "ok" | "error"): string {
  if (status === "running") {
    return RUNNING_LABELS[name] ?? formatFallbackName(name);
  }
  return COMPLETED_LABELS[name] ?? formatFallbackName(name);
}

function formatFallbackName(name: string): string {
  return name
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

/**
 * Sanitizes backend tool result summaries to shopper-friendly text,
 * removing technical telemetry, raw variable prefixes (e.g. "UI: "), and raw errors.
 */
export function formatToolSummary(summary?: string): string | null {
  if (!summary) return null;
  const trimmed = summary.trim();

  // Pattern: "4 results of 7" or "1 result of 7" -> "4 products found"
  const resultsMatch = trimmed.match(/^(\d+)\s+results?\s+of\s+\d+$/i);
  if (resultsMatch) {
    const count = parseInt(resultsMatch[1], 10);
    return count === 1 ? "1 product found" : `${count} products found`;
  }

  // Pattern: "UI: open_compare" -> "Opened compare workspace"
  if (trimmed.startsWith("UI: open_compare")) {
    return "Opened compare workspace";
  }
  if (trimmed.startsWith("UI: highlight")) {
    return "Highlighted matching products";
  }
  if (trimmed.startsWith("UI:")) {
    const action = trimmed.replace("UI:", "").trim().replace(/[_-]+/g, " ");
    return action.charAt(0).toUpperCase() + action.slice(1);
  }

  // Pattern: "verified ✓ · store accepted" -> "Verified in cart"
  if (trimmed.includes("verified ✓") || trimmed.includes("store accepted")) {
    return "Verified in cart";
  }

  // Pattern: "NOT verified ✕" -> "Could not verify"
  if (trimmed.includes("NOT verified") || trimmed.includes("dropped write")) {
    return "Could not verify";
  }

  // Pattern: "in stock (4)" -> "In stock (4 units)"
  if (trimmed.toLowerCase().startsWith("in stock")) {
    return trimmed.replace(/^in stock/i, "In stock").replace(/\((\d+)\)/, "($1 units)");
  }

  // Pattern: "winner found" / "close call"
  if (trimmed.includes("winner found")) {
    return "Found top match";
  }
  if (trimmed.includes("close call")) {
    return "Close specifications";
  }

  // Clean any remaining raw snake_case
  return trimmed.replace(/_/g, " ");
}
