"use client";

import { Tooltip as HeroUITooltip } from "@heroui/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface TooltipProps {
  content: ReactNode;
  side?: "top" | "bottom";
  /** A single HeroUI/React Aria focusable (Button, IconButton): it becomes the trigger. */
  children: ReactNode;
  className?: string;
  delay?: number;
}

/** HeroUI tooltip on hover and keyboard focus, wired with aria-describedby by React Aria. */
export function Tooltip({ content, side = "top", children, className, delay = 400 }: TooltipProps) {
  return (
    <HeroUITooltip.Root delay={delay} closeDelay={80}>
      {children}
      <HeroUITooltip.Content
        placement={side}
        offset={8}
        className={cn("z-tooltip max-w-56 rounded-lg bg-text px-2.5 py-1.5 text-xs font-medium text-bg shadow-lg", className)}
      >
        {content}
      </HeroUITooltip.Content>
    </HeroUITooltip.Root>
  );
}
