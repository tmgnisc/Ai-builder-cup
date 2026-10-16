"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type PopoverSide = "top" | "bottom" | "left" | "right";

export interface PopoverProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactNode;
  content: ReactNode;
  side?: PopoverSide;
  className?: string;
  children?: ReactNode;
}

const SIDE_CLASSES: Record<PopoverSide, string> = {
  top: "bottom-full mb-2 left-1/2 -translate-x-1/2",
  bottom: "top-full mt-2 left-1/2 -translate-x-1/2",
  left: "right-full mr-2 top-1/2 -translate-y-1/2",
  right: "left-full ml-2 top-1/2 -translate-y-1/2",
};

/**
 * Accessible Popover primitive for anchored floating panels (used by SpeechBubble and PipMenu).
 */
export function Popover({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  trigger,
  content,
  side = "bottom",
  className,
  children,
}: PopoverProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const setOpen = (val: boolean) => {
    if (!isControlled) setUncontrolledOpen(val);
    onOpenChange?.(val);
  };

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-block">
      {trigger && (
        <div onClick={() => setOpen(!open)} className="inline-block cursor-pointer">
          {trigger}
        </div>
      )}
      {children}
      {open && (
        <div
          role="region"
          aria-live="polite"
          className={cn(
            "panel-solid absolute z-50 min-w-48 overflow-hidden rounded-card p-3 shadow-popover transition-all duration-200 ease-[var(--ease-out-expo)] animate-in fade-in-0 zoom-in-95",
            SIDE_CLASSES[side],
            className,
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
}
