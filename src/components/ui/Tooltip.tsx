"use client";

import { cloneElement, useId, type ReactElement, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface TooltipProps {
  content: ReactNode;
  side?: "top" | "bottom";
  /** A single focusable element; it receives aria-describedby. */
  children: ReactElement<{ "aria-describedby"?: string }>;
  className?: string;
}

/** CSS-only tooltip that shows on hover and keyboard focus. */
export function Tooltip({ content, side = "top", children, className }: TooltipProps) {
  const id = useId();
  return (
    <span className="group/tt relative inline-flex">
      {cloneElement(children, { "aria-describedby": id })}
      <span
        role="tooltip"
        id={id}
        className={cn(
          "pointer-events-none absolute left-1/2 z-50 w-max max-w-56 -translate-x-1/2 rounded-lg bg-text px-2.5 py-1.5 text-xs font-medium text-bg opacity-0 shadow-lg transition-[opacity,transform] duration-200",
          "group-hover/tt:opacity-100 group-focus-within/tt:opacity-100",
          side === "top" ? "bottom-full mb-2 translate-y-1 group-hover/tt:translate-y-0" : "top-full mt-2 -translate-y-1 group-hover/tt:translate-y-0",
          className,
        )}
      >
        {content}
      </span>
    </span>
  );
}
