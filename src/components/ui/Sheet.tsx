"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

type Side = "right" | "bottom" | "left";

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  side?: Side;
  /** Extra content placed in the header row, before the close button. */
  headerExtra?: ReactNode;
  className?: string;
  children: ReactNode;
}

const PANEL: Record<Side, { base: string; closed: string }> = {
  right: { base: "inset-y-3 right-3 w-[min(420px,calc(100vw-24px))]", closed: "translate-x-[calc(100%+24px)]" },
  left: { base: "inset-y-3 left-3 w-[min(420px,calc(100vw-24px))]", closed: "-translate-x-[calc(100%+24px)]" },
  bottom: { base: "inset-x-3 bottom-3 max-h-[min(80dvh,720px)]", closed: "translate-y-[calc(100%+24px)]" },
};

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';

const noop = () => () => {};

/**
 * Accessible side sheet: portal, modal dialog semantics, focus trap, Escape to close,
 * focus restore. Stays mounted (inert when closed) so open/close is a pure CSS transition.
 */
export function Sheet({ open, onOpenChange, title, description, side = "right", headerExtra, className, children }: SheetProps) {
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!open) return;
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
  }, [open, onOpenChange]);

  if (!mounted) return null;

  return createPortal(
    <div className={cn("fixed inset-0 z-50", !open && "pointer-events-none")} inert={!open}>
      <div
        aria-hidden
        onClick={() => onOpenChange(false)}
        className={cn(
          "absolute inset-0 bg-overlay transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          "glass absolute flex flex-col overflow-hidden rounded-[var(--radius-panel)] transition-transform duration-500 ease-[var(--ease-out-expo)] motion-reduce:transition-none",
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
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="-mr-1.5 grid size-8 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-text"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
