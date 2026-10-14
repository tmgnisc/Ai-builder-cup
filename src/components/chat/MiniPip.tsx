"use client";

import { STATES } from "@/components/companion/states";
import { cn } from "@/lib/cn";
import { useCompanion } from "@/store/useCompanion";

/** Tiny Pip avatar. When `live`, its rim mirrors Pip's current state colour. */
export function MiniPip({ live = false, size = 26, className }: { live?: boolean; size?: number; className?: string }) {
  const state = useCompanion((s) => s.state);
  const color = live ? STATES[state].color : "var(--accent)";
  const happy = live && (state === "success" || state === "greeting");
  const closed = live && state === "sleeping";
  return (
    <span
      aria-hidden
      className={cn("grid shrink-0 place-items-center rounded-full bg-[#05060a] transition-shadow duration-500", className)}
      style={{ width: size, height: size, boxShadow: `inset 0 0 0 1.5px ${color}, 0 0 14px -4px ${color}` }}
    >
      <span className="flex gap-[18%]" style={{ width: "50%", justifyContent: "center" }}>
        {[0, 1].map((i) => (
          <span
            key={i}
            className={cn("bg-white transition-all duration-300", happy ? "h-[3px] rounded-t-full" : closed ? "h-[1.5px]" : "rounded-full")}
            style={{ width: size * 0.12, height: happy || closed ? undefined : size * 0.26 }}
          />
        ))}
      </span>
    </span>
  );
}
