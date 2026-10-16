import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface StatRowProps {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  className?: string;
}

export function StatRow({ label, value, hint, className }: StatRowProps) {
  return (
    <div className={cn("flex items-baseline justify-between py-2 text-sm border-b border-border/50 last:border-b-0", className)}>
      <dt className="text-muted font-normal">
        {label}
        {hint && <span className="ml-1 text-2xs text-muted/80">({hint})</span>}
      </dt>
      <dd className="font-mono text-text text-right font-medium tabular">{value}</dd>
    </div>
  );
}
