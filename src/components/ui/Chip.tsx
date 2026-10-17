"use client";

import { Chip as HeroUIChip } from "@heroui/react";
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
      <HeroUIChip
        variant="soft"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md bg-surface-2 px-2.5 py-1 text-xs text-text hairline",
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
            "grid size-4 place-items-center rounded text-muted hover:text-text",
            focusRing,
          )}
        >
          <X className="size-3" aria-hidden />
        </button>
      </HeroUIChip>
    );
  }

  return (
    <button
      type={type}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors duration-150",
        focusRing,
        active
          ? "bg-accent text-accent-fg shadow-[0_0_0_1px_var(--border-strong)]"
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

