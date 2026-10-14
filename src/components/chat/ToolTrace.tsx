"use client";

import {
  ChevronDown,
  Loader2,
  PackageCheck,
  PackageSearch,
  Scale,
  Search,
  ShoppingCart,
  Trash2,
  Truck,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import type { TraceEntry } from "@/store/useChat";

const ICON: Record<string, LucideIcon> = {
  search_products: Search,
  get_product: PackageSearch,
  compare_products: Scale,
  check_stock: PackageCheck,
  get_delivery_info: Truck,
  add_to_cart: ShoppingCart,
  remove_from_cart: Trash2,
  get_cart: ShoppingCart,
};

/** Compact, collapsible list of the agent's tool calls, so its steps are visible. */
export function ToolTrace({ trace, defaultOpen }: { trace: TraceEntry[]; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  if (!trace.length) return null;
  const total = trace.reduce((s, t) => s + (t.durationMs ?? 0), 0);
  const running = trace.some((t) => t.status === "running");
  const failed = trace.some((t) => t.status === "error");

  return (
    <div className="mt-2 font-mono text-[11px] text-muted">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-full px-1.5 py-0.5 hover:text-text"
      >
        {running ? <Loader2 className="size-3 animate-spin" aria-hidden /> : <Wrench className="size-3" aria-hidden />}
        {trace.length} step{trace.length === 1 ? "" : "s"}
        {!running && ` · ${total}ms`}
        {failed && <span className="text-danger">· issue</span>}
        <ChevronDown className={cn("size-3 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <ol className="mt-1 space-y-0.5 border-l border-border pl-2.5" aria-label="Agent steps">
          {trace.map((t) => {
            const Icon = ICON[t.name] ?? Wrench;
            return (
              <li key={t.callId} className={cn("flex items-center gap-1.5", t.status === "error" && "text-danger")}>
                {t.status === "running" ? <Loader2 className="size-3 shrink-0 animate-spin" aria-hidden /> : <Icon className="size-3 shrink-0" aria-hidden />}
                <span className="text-text/80">{t.name}</span>
                {t.summary && <span>· {t.summary}</span>}
                {t.durationMs !== undefined && <span className="opacity-70">· {t.durationMs}ms</span>}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
