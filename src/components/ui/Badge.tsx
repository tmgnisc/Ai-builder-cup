import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { stockLabel, stockLevel } from "@/lib/commerce/format";

export type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger" | "info";

const TONE: Record<BadgeTone, string> = {
  neutral: "bg-surface-2 text-muted hairline",
  accent: "bg-accent text-accent-fg",
  success: "bg-listening/12 text-listening",
  warning: "bg-thinking/12 text-thinking",
  danger: "bg-danger/12 text-danger",
  info: "bg-searching/12 text-searching",
};

interface BadgeProps extends ComponentProps<"span"> {
  tone?: BadgeTone;
  dot?: boolean;
}

export function Badge({ tone = "neutral", dot, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium leading-none tracking-wide",
        TONE[tone],
        className,
      )}
      {...props}
    >
      {dot && <span aria-hidden className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function StockBadge({ stock, className }: { stock: number; className?: string }) {
  const level = stockLevel(stock);
  const tone: BadgeTone = level === "out" ? "danger" : level === "low" ? "warning" : "success";
  return (
    <Badge tone={tone} dot className={className}>
      {stockLabel(stock)}
    </Badge>
  );
}
