"use client";

import { Check, Radar, Scale, ShieldCheck, X, type LucideIcon } from "lucide-react";
import type { SubAgentEvent } from "@/lib/agent/types";
import { cn } from "@/lib/cn";

const ICON: Record<SubAgentEvent["agent"], LucideIcon> = { scout: Radar, analyst: Scale, guard: ShieldCheck };

/** "Product Finder (Scout)" → "Scout". */
const shortName = (a: SubAgentEvent) => /\(([^)]+)\)/.exec(a.name)?.[1] ?? a.name;

function line(a: SubAgentEvent): string {
  const who = shortName(a);
  if (a.status === "completed") {
    if (a.detail) return `${who}: ${a.detail}`;
    return a.resultsCount !== undefined ? `${who} matched ${a.resultsCount} item${a.resultsCount === 1 ? "" : "s"}` : `${who} finished`;
  }
  if (a.status === "failed") return `${who} couldn't finish: ${a.detail ?? a.task}`;
  return `${who}: ${a.task}…`;
}

/**
 * Live pills for the sub-agents Pip delegated to in this reply (Scout searching, Analyst comparing,
 * Guard verifying the cart). Active ones pulse; completed and failed ones settle with a ✓ / ✕.
 */
export function SubAgentStatus({ agents, className }: { agents?: SubAgentEvent[]; className?: string }) {
  if (!agents?.length) return null;
  return (
    <ul className={cn("mt-1.5 flex flex-col gap-1", className)} aria-label="Pip's helpers">
      {agents.map((a) => {
        const Icon = ICON[a.agent] ?? Radar;
        const done = a.status === "completed";
        const failed = a.status === "failed";
        const active = !done && !failed;
        return (
          <li
            key={a.agent}
            aria-live="polite"
            className={cn(
              "flex w-fit max-w-full items-center gap-1.5 rounded-md px-2 py-1 text-2xs hairline",
              failed ? "bg-danger/10 text-danger" : done ? "bg-surface-2 text-muted" : "bg-accent/10 text-text",
            )}
          >
            <span className="relative grid size-3.5 shrink-0 place-items-center" aria-hidden>
              {active && <span className="absolute inset-0 animate-ping rounded-full bg-accent/40 motion-reduce:animate-none" />}
              {done ? <Check className="size-3 text-listening" /> : failed ? <X className="size-3" /> : <Icon className="relative size-3 text-accent-text" />}
            </span>
            <span className="truncate">{line(a)}</span>
          </li>
        );
      })}
    </ul>
  );
}
