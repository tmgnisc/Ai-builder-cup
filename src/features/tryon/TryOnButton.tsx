"use client";

import { Sparkles } from "lucide-react";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/Button";
import { useTryOn } from "@/store/useTryOn";

export function TryOnButton({ productId, size = "lg", variant = "outline", className }: { productId: string; size?: ButtonSize; variant?: ButtonVariant; className?: string }) {
  const openFor = useTryOn((s) => s.openFor);
  return (
    <Button size={size} variant={variant} className={className} onClick={() => openFor(productId)} iconLeft={<Sparkles className="size-4" aria-hidden />}>
      Try it on
    </Button>
  );
}
