"use client";

import { AlertCircle, Loader2, ShoppingBag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { useCart } from "@/store/useCart";

/**
 * One-tap purchase from anywhere Pip shows a product: adds it (verified against a fresh cart read)
 * and opens checkout, where the shopper still confirms the order themselves. If the item is already
 * in the cart it goes straight to checkout instead of adding a second one.
 */
export function BuyNowButton({ productId, productName, disabled, className }: { productId: string; productName: string; disabled?: boolean; className?: string }) {
  const router = useRouter();
  const addWithFeedback = useCart((s) => s.addWithFeedback);
  const inCart = useCart((s) => !!s.cart?.lines.some((l) => l.productId === productId));
  const [state, setState] = useState<"idle" | "busy" | "failed">("idle");

  async function buy(e: { currentTarget: Element }) {
    if (state === "busy") return;
    if (inCart) return router.push("/checkout");
    setState("busy");
    const ok = await addWithFeedback(productId, e.currentTarget.closest("li") ?? e.currentTarget);
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
      aria-label={state === "failed" ? `Couldn't add ${productName}. Try again.` : `Buy ${productName} now`}
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
      {state === "failed" ? "Retry" : "Buy"}
    </Button>
  );
}
