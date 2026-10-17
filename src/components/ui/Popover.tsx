"use client";

import { Popover as HeroUIPopover } from "@heroui/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type PopoverSide = "top" | "bottom" | "left" | "right";

export interface PopoverProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** A HeroUI/React Aria pressable (Button, IconButton). */
  trigger: ReactNode;
  content: ReactNode;
  side?: PopoverSide;
  /** Accessible name for the popover dialog. */
  label?: string;
  className?: string;
}

/** HeroUI popover: positioned, dismissable (Escape / outside press), focus-managed by React Aria. */
export function Popover({ open, defaultOpen, onOpenChange, trigger, content, side = "bottom", label, className }: PopoverProps) {
  return (
    <HeroUIPopover.Root isOpen={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      {trigger}
      <HeroUIPopover.Content
        placement={side}
        offset={8}
        className={cn("panel-solid z-popover min-w-48 overflow-hidden rounded-card p-3 shadow-xl", className)}
      >
        <HeroUIPopover.Dialog aria-label={label} className="outline-none">
          {content}
        </HeroUIPopover.Dialog>
      </HeroUIPopover.Content>
    </HeroUIPopover.Root>
  );
}
