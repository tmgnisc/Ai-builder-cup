import { X } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { focusRing } from "./focusRing";

export interface ChipProps extends ComponentProps<"button"> {
  active?: boolean;
  onRemove?: () => void;
  removeLabel?: string;
  icon?: ReactNode;
}

export function Chip({
  active = false,
  onRemove,
  removeLabel = "Remove filter",
  icon,
  children,
  className,
  type = "button",
  ...props
}: ChipProps) {
  if (onRemove) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-xs text-text hairline",
          className,
        )}
      >
        {icon}
        <span>{children}</span>
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel}
          className={cn(
            "grid size-4 place-items-center rounded-full text-muted hover:text-text",
            focusRing,
          )}
        >
          <X className="size-3" aria-hidden />
        </button>
      </span>
    );
  }

  return (
    <button
      type={type}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-150",
        focusRing,
        active
          ? "bg-accent text-accent-fg shadow-[0_0_12px_-2px_var(--accent)]"
          : "bg-surface-2 text-muted hairline hover:bg-surface-2/80 hover:text-text",
        className,
      )}
      {...props}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}
