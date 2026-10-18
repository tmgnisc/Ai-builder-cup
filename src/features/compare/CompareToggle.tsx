"use client";

import { Check, GitCompareArrows } from "lucide-react";
import { buttonClasses } from "@/components/ui/buttonClasses";
import { cn } from "@/lib/cn";
import { useCompare } from "@/store/useCompare";

interface CompareToggleProps {
  productId: string;
  productName: string;
  variant?: "icon" | "pill";
  className?: string;
}

export function CompareToggle({ productId, productName, variant = "icon", className }: CompareToggleProps) {
  const active = useCompare((s) => s.ids.includes(productId));
  const toggle = useCompare((s) => s.toggle);

  if (variant === "pill") {
    return (
      <button
        type="button"
        aria-pressed={active}
        onClick={() => toggle(productId)}
        className={cn(
          buttonClasses({ variant: "secondary", size: "lg" }),
          "text-sm",
          active && "bg-searching/15 text-searching shadow-[inset_0_0_0_1px_var(--state-searching)] hover:bg-searching/20",
          className,
        )}
      >
        {active ? <Check className="size-4" aria-hidden /> : <GitCompareArrows className="size-4" aria-hidden />}
        {active ? "In comparison" : "Compare"}
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? `Remove ${productName} from comparison` : `Add ${productName} to comparison`}
      title={active ? "Remove from compare" : "Compare"}
      onClick={() => toggle(productId)}
      className={cn(
        "grid size-9 place-items-center rounded-full backdrop-blur-md transition-colors",
        active ? "bg-searching text-bg" : "bg-black/35 text-white hover:bg-black/55",
        className,
      )}
    >
      {active ? <Check className="size-4" aria-hidden /> : <GitCompareArrows className="size-4" aria-hidden />}
    </button>
  );
}
