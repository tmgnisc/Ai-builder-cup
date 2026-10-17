"use client";

import { AlertCircle, Loader2, ShoppingBag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { useCart } from "@/store/useCart";

/**
 * One-tap purchase from anywhere Pip shows products: adds them (each verified against a fresh cart
 * read) and opens checkout, where the shopper still confirms the order themselves. Items already in
 * the cart aren't added twice. Pass several ids (a bundle) for "Buy all".
 */
export function BuyNowButton({
  productId,
  productIds,
  productName,
  label = "Buy",
  disabled,
  className,
}: {
  productId?: string;
  productIds?: string[];
  productName: string;
  label?: string;
  disabled?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const addWithFeedback = useCart((s) => s.addWithFeedback);
  const ids = productIds ?? (productId ? [productId] : []);
  const missing = useCart((s) => ids.filter((id) => !s.cart?.lines.some((l) => l.productId === id)).join(","));
  const [state, setState] = useState<"idle" | "busy" | "failed">("idle");

  async function buy(e: { currentTarget: Element }) {
    if (state === "busy") return;
    const toAdd = missing ? missing.split(",") : [];
    if (toAdd.length === 0) return router.push("/checkout");
    setState("busy");
    const source = e.currentTarget.closest("li") ?? e.currentTarget;
    let ok = true;
    // Sequential: each add is verified against a fresh cart read before the next one.
    for (const id of toAdd) {
      if (!(await addWithFeedback(id, source))) {
        ok = false;
        break;
      }
    }
    if (ok) {
      setState("idle");
      router.push("/checkout");
    } else {
      setState("failed");
      window.setTimeout(() => setState("idle"), 2400);
    }
  }

  return (
    <Button
      size="sm"
      variant={state === "failed" ? "outline" : "primary"}
      disabled={disabled}
      onClick={(e) => void buy(e)}
      aria-label={state === "failed" ? `Couldn't add ${productName}. Try again.` : `${label} ${productName} now`}
      className={cn("h-7 shrink-0 px-2.5 text-2xs", state === "failed" && "border-danger text-danger", className)}
      iconLeft={
        state === "busy" ? (
          <Loader2 className="size-3 animate-spin" aria-hidden />
        ) : state === "failed" ? (
          <AlertCircle className="size-3" aria-hidden />
        ) : (
          <ShoppingBag className="size-3" aria-hidden />
        )
      }
    >
      {state === "failed" ? "Retry" : label}
    </Button>
  );
}
