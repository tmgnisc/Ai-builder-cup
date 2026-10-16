import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className={cn(
        "grid place-items-center rounded-panel p-8 text-center text-muted",
        className,
      )}
    >
      <div className="flex max-w-sm flex-col items-center gap-3">
        {icon && <div className="grid size-12 place-items-center rounded-full bg-surface-2 text-muted">{icon}</div>}
        <h3 className="font-display text-base font-semibold text-text">{title}</h3>
        {description && <p className="text-sm text-muted">{description}</p>}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}
