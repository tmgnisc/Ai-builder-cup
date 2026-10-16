"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { IconButton } from "./IconButton";

export type DrawerSide = "right" | "bottom" | "left";

export interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  side?: DrawerSide;
  headerExtra?: ReactNode;
  footer?: ReactNode;
  className?: string;
  modal?: boolean;
  onPanelPointerEnter?: () => void;
  onPanelPointerDown?: () => void;
  children: ReactNode;
}

const PANEL: Record<DrawerSide, { base: string; closed: string }> = {
  right: { base: "inset-y-3 right-3 drawer-width", closed: "drawer-closed-right" },
  left: { base: "inset-y-3 left-3 drawer-width", closed: "drawer-closed-left" },
  bottom: { base: "inset-x-3 bottom-3 drawer-bottom-h", closed: "drawer-closed-bottom" },
};

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';

const noop = () => () => {};

/**
 * Accessible Drawer replacing Sheet across CartDrawer, CompareDrawer, and Mobile Filters.
 * Supports modal dialog semantics, keyboard trap, Escape listener, and non-modal peek.
 */
export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  side = "right",
  headerExtra,
  footer,
  className,
  modal = true,
  onPanelPointerEnter,
  onPanelPointerDown,
  children,
}: DrawerProps) {
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!open || !modal) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onOpenChange(false);
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (items.length === 0) return;
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      restoreRef.current?.focus?.({ preventScroll: true });
    };
  }, [open, modal, onOpenChange]);

  if (!mounted) return null;

  return createPortal(
    <div className={cn("fixed inset-0", modal ? "z-modal" : "z-drawer", (!open || !modal) && "pointer-events-none", !open && "invisible")} inert={!open}>
      <div
        aria-hidden
        onClick={() => onOpenChange(false)}
        className={cn(
          "absolute inset-0 bg-overlay transition-opacity duration-300",
          open && modal ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal={modal}
        data-drawer-open={open ? "true" : "false"}
        data-sheet-open={open ? "true" : "false"}
        onPointerEnter={onPanelPointerEnter}
        onPointerDown={onPanelPointerDown}
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          "panel-solid absolute flex flex-col overflow-hidden rounded-panel transition-transform duration-500 ease-[var(--ease-out-expo)] motion-reduce:transition-none",
          open ? "pointer-events-auto" : "pointer-events-none invisible",
          PANEL[side].base,
          !open && PANEL[side].closed,
          className,
        )}
      >
        <div className="flex items-start gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="font-display text-base font-semibold tracking-tight">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-0.5 text-sm text-muted">
                {description}
              </p>
            )}
          </div>
          {headerExtra}
          <IconButton
            size="sm"
            variant="ghost"
            aria-label="Close drawer"
            onClick={() => onOpenChange(false)}
            className="-mr-1.5"
          >
            <X className="size-4" />
          </IconButton>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>

        {footer && <div className="border-t border-border bg-surface/60 px-5 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
