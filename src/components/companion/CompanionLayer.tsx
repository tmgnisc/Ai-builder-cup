"use client";

/**
 * Fixed, full-viewport companion layer. The layer itself never catches pointer events;
 * only Pip's own hit area does, so the page underneath stays fully interactive.
 *
 * Phase 1: a static CSS stand-in for Pip in the dock position.
 * Phase 2: the single WebGL canvas lives in this layer and its box is tweened between
 * the hero anchor (`[data-pip-anchor="hero"]`, "/" only) and the dock anchor.
 */
export function CompanionLayer() {
  return (
    <div className="pointer-events-none fixed inset-0 z-30">
      {/* Dock anchor: 72px orb on mobile, 180px dock on desktop, bottom-right everywhere. */}
      <div
        data-pip-anchor="dock"
        className="absolute bottom-4 right-4 size-[72px] md:bottom-6 md:right-6 md:size-[180px]"
      >
        <button
          type="button"
          aria-label="Pip, idle. Open chat"
          className="pointer-events-auto group relative grid size-full place-items-center rounded-full focus-visible:outline-offset-[-8px]"
        >
          <PipStandIn />
        </button>
      </div>
      <p aria-live="polite" className="sr-only" id="pip-caption" />
    </div>
  );
}

/** Placeholder orb until the three.js Pip ships in Phase 2. */
function PipStandIn() {
  return (
    <span className="relative grid size-[64%] place-items-center">
      <span
        aria-hidden
        className="absolute inset-[-30%] rounded-full opacity-60 blur-2xl"
        style={{ background: "radial-gradient(circle, var(--accent) 0%, transparent 65%)" }}
      />
      <span
        aria-hidden
        className="relative grid size-full place-items-center rounded-full transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:scale-105"
        style={{
          background:
            "radial-gradient(circle at 35% 30%, color-mix(in oklab, var(--accent), white 35%) 0%, var(--accent) 35%, color-mix(in oklab, var(--accent), black 55%) 100%)",
          boxShadow: "inset 0 -6px 18px rgb(0 0 0 / 0.35), 0 10px 40px -10px var(--accent)",
        }}
      >
        <span className="flex gap-[14%] translate-y-[-6%]" style={{ width: "40%", justifyContent: "center" }}>
          <span className="aspect-[1/2] w-[22%] rounded-full bg-accent-fg/85" />
          <span className="aspect-[1/2] w-[22%] rounded-full bg-accent-fg/85" />
        </span>
      </span>
    </span>
  );
}
