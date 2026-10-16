"use client";

import { Check, Loader2, X } from "lucide-react";
import { ProductImage } from "@/components/store/ProductImage";
import { cn } from "@/lib/cn";
import { getProduct } from "@/lib/commerce/catalog";
import { formatNPR } from "@/lib/commerce/format";
import type { CartLine } from "@/lib/commerce/schemas";

/**
 * Cart action status: pending → verified ✓ / failed ✕. On success it shows the cart line
 * exactly as returned by the get_cart verification call, not what the agent assumed.
 */
export function CartActionCard({
  action,
  productId,
  status,
  line,
  message,
}: {
  action: "add" | "remove";
  productId: string;
  status: "pending" | "verified" | "failed";
  line?: CartLine | null;
  message?: string;
}) {
  const p = getProduct(productId);
  if (!p) return null;
  const verb = action === "add" ? "Adding" : "Removing";

  return (
    <div
      role="status"
      className={cn(
        "mt-2.5 flex items-center gap-3 rounded-2xl p-2.5 transition-colors duration-500",
        status === "pending" && "bg-surface hairline",
        status === "verified" && "bg-success/10 shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--state-success)_40%,transparent)]",
        status === "failed" && "bg-danger/10 shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--state-error)_40%,transparent)]",
      )}
    >
      <div className="size-11 shrink-0 overflow-hidden rounded-xl">
        <ProductImage product={p} variant="cart-action" showInitials={false} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{p.name}</p>
        {status === "pending" && <p className="text-xs text-muted">{verb} and checking the cart…</p>}
        {status === "verified" && action === "add" && line && (
          <p className="font-mono text-xs text-success">
            In cart: {line.qty} × {formatNPR(line.unitPrice)} = {formatNPR(line.lineTotal)}
          </p>
        )}
        {status === "verified" && action === "remove" && <p className="text-xs text-success">Removed. Cart re-checked.</p>}
        {status === "failed" && <p className="text-xs text-danger">{message ?? "Didn't go through."}</p>}
      </div>
      <span
        className={cn(
          "grid size-7 shrink-0 place-items-center rounded-full",
          status === "pending" && "text-muted",
          status === "verified" && "bg-success text-bg",
          status === "failed" && "bg-danger text-bg",
        )}
        aria-label={status === "verified" ? "Verified" : status === "failed" ? "Failed" : "Pending"}
      >
        {status === "pending" ? <Loader2 className="size-4 animate-spin" /> : status === "verified" ? <Check className="size-4" /> : <X className="size-4" />}
      </span>
    </div>
  );
}
