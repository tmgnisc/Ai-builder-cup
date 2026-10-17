"use client";

import { ChevronDown, Loader2, Wrench } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import type { TraceEntry } from "@/store/useChat";
import { formatToolLabel, formatToolSummary, TOOL_ICONS } from "./agentTraceFormat";

/** Compact, collapsible list of the agent's activity steps. */
export function ToolTrace({ trace, defaultOpen }: { trace: TraceEntry[]; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  if (!trace.length) return null;
  const running = trace.some((t) => t.status === "running");
  const failed = trace.some((t) => t.status === "error");

  return (
    <div className="mt-2 text-2xs text-muted">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 transition-colors hover:text-text"
      >
        {running ? <Loader2 className="size-3 animate-spin" aria-hidden /> : <Wrench className="size-3" aria-hidden />}
        {trace.length} action{trace.length === 1 ? "" : "s"} taken
        {failed && <span className="text-state-error">· notice</span>}
        <ChevronDown className={cn("size-3 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <ol className="mt-1 space-y-1 border-l border-border pl-2.5" aria-label="Agent steps">
          {trace.map((t) => {
            const Icon = TOOL_ICONS[t.name] ?? Wrench;
            const label = formatToolLabel(t.name, t.status);
            const summary = formatToolSummary(t.summary);
            return (
              <li key={t.callId} className={cn("flex items-center gap-1.5", t.status === "error" && "text-state-error")}>
                {t.status === "running" ? <Loader2 className="size-3 shrink-0 animate-spin" aria-hidden /> : <Icon className="size-3 shrink-0 opacity-70" aria-hidden />}
                <span className="text-text/80">{label}</span>
                {summary && <span className="opacity-70">· {summary}</span>}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
