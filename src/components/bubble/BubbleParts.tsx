"use client";

import { ChevronDown, Loader2, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ProductImage } from "@/components/store/ProductImage";
import { IconButton } from "@/components/ui/IconButton";
import { Chip } from "@/components/ui/Chip";
import { cn } from "@/lib/cn";
import { getProduct } from "@/lib/commerce/catalog";
import { formatNPR, keySpecs, stockLabel } from "@/lib/commerce/format";
import type { Product } from "@/lib/commerce/schemas";
import type { BubbleChip } from "@/store/useBubble";
import { useCart } from "@/store/useCart";
import type { TraceEntry } from "@/store/useChat";
import { useChat } from "@/store/useChat";

/** 1–3 compact product rows inside Pip's bubble. "Add" goes through Pip so it's verified. */
export function MiniCards({ productIds, interactive }: { productIds: string[]; interactive: boolean }) {
  const send = useChat((s) => s.send);
  const pending = useCart((s) => s.pending);
  const products = productIds.map(getProduct).filter((p): p is Product => !!p).slice(0, 3);
  return (
    <ul className="mt-2.5 flex flex-col gap-1.5">
      {products.map((p, i) => (
        <li key={p.id} className="flex items-center gap-2.5 rounded-xl bg-surface/70 p-1.5 pr-2 hairline">
          <Link href={`/product/${p.id}`} className="relative size-11 shrink-0 overflow-hidden rounded-lg" aria-label={`View ${p.name}`}>
            <span data-chat-product={p.id} className="block size-full">
              <ProductImage product={p} variant={`bubble-${i}`} showInitials={false} className={p.stock === 0 ? "opacity-60 grayscale-[40%]" : undefined} />
            </span>
            {productIds.length > 1 && (
              <span className="absolute left-0.5 top-0.5 grid size-4 place-items-center rounded-full bg-black/60 font-mono text-2xs font-bold text-white">{i + 1}</span>
            )}
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium leading-tight">{p.name}</p>
            <p className="truncate font-mono text-2xs text-muted">
              {formatNPR(p.price)} ·{" "}
              {p.stock === 0 ? (
                <span className="text-danger">{stockLabel(p.stock)}</span>
              ) : (
                keySpecs(p)
                  .slice(0, 2)
                  .map((s) => (s.value === "Yes" ? s.label : s.value))
                  .join(" · ")
              )}
            </p>
          </div>
          <IconButton
            size="sm"
            variant="primary"
            disabled={!interactive || p.stock === 0}
            onClick={() => send(`Add the ${p.name} to my cart`)}
            aria-label={`Ask Pip to add the ${p.name} to the cart`}
            className="size-7 shrink-0"
          >
            {pending.includes(p.id) ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
          </IconButton>
        </li>
      ))}
    </ul>
  );
}

export function Chips({ chips, onPick }: { chips: BubbleChip[]; onPick: (c: BubbleChip) => void }) {
  return (
    <div className="mt-2.5 flex flex-wrap gap-1.5">
      {chips.map((c) => (
        <Chip
          key={c.label}
          active={c.primary}
          onClick={() => onPick(c)}
        >
          {c.label}
        </Chip>
      ))}
    </div>
  );
}

/** One tiny line: the agent's main step, expandable to the full trace. */
export function TraceLine({ trace }: { trace: TraceEntry[] }) {
  const [open, setOpen] = useState(false);
  if (!trace.length) return null;
  const running = trace.find((t) => t.status === "running");
  const main = running ?? trace.find((t) => t.name !== "get_cart") ?? trace[0];
  const verify = trace.find((t) => t.name === "get_cart" && t.summary?.includes("verified"));
  return (
    <div className="mt-2 font-mono text-2xs text-muted">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex max-w-full items-center gap-1 hover:text-text">
        {running && <Loader2 className="size-3 shrink-0 animate-spin" aria-hidden />}
        <span className="truncate">
          {main.name}
          {main.summary && ` · ${main.summary}`}
          {main.durationMs !== undefined && ` · ${main.durationMs}ms`}
          {verify && !open && ` · ${verify.summary?.split(" · ")[0]}`}
          {trace.length > 1 && !open && ` · +${trace.length - 1}`}
        </span>
        <ChevronDown className={cn("size-3 shrink-0 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <ol className="mt-1 space-y-0.5 border-l border-border pl-2">
          {trace.map((t) => (
            <li key={t.callId} className={cn("truncate", t.status === "error" && "text-danger")}>
              {t.name}
              {t.summary && ` · ${t.summary}`}
              {t.durationMs !== undefined && ` · ${t.durationMs}ms`}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
