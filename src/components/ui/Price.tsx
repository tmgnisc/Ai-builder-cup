import { formatNPR } from "@/lib/commerce/format";
import { cn } from "@/lib/cn";

export interface PriceProps {
  amount: number;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
}

const SIZE_CLASSES = {
  xs: "text-xs font-medium",
  sm: "text-sm font-medium",
  md: "text-base font-semibold",
  lg: "text-lg font-semibold",
  xl: "text-xl font-bold",
  "2xl": "text-2xl font-bold tracking-tight",
};

/**
 * Standardized Price component rendering NPR currency with tabular digits and font-mono.
 */
export function Price({ amount, size = "md", className }: PriceProps) {
  return (
    <span className={cn("font-mono tabular whitespace-nowrap text-text", SIZE_CLASSES[size], className)}>
      {formatNPR(amount)}
    </span>
  );
}
