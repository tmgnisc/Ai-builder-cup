"use client";

import { useAnchors } from "@/lib/guide/anchors";
import { ProductImage } from "@/features/catalog";
import { useDebugOverlay } from "@/components/guide/AnchorDebug";
import { startTour } from "@/components/guide/tour";
import { Button } from "@/components/ui/Button";
import { getProduct } from "@/lib/commerce/catalog";
import { formatNPR } from "@/lib/commerce/format";
import type { Trigger } from "@/lib/guide/engine";
import { suggestionsFor, useBubble } from "@/store/useBubble";
import { useChat } from "@/store/useChat";
import { useGuide } from "@/store/useGuide";
import { usePipPosition } from "@/store/usePipPosition";

const SAMPLE_IDS = ["acer-swift-go-14", "lenovo-ideapad-slim-5-14", "sony-wh-1000xm5"];

/** Playground controls for roaming, the guide engine and every bubble content type. */
export function RoamingPanel() {
  const pos = usePipPosition();
  const anchors = useAnchors();
  const debugOn = useDebugOverlay((s) => s.on);
  const toggleDebug = useDebugOverlay((s) => s.toggle);
  const lastDecision = useGuide((s) => s.lastDecision);
  const show = useBubble((s) => s.show);

  const fire = (t: Trigger) => (window as unknown as { __guide?: { fire: (t: Trigger) => void } }).__guide?.fire(t);
  const randomAnchor = () => {
    const pool = anchors.filter((a) => a.visible > 0.5 && a.id !== "stage");
    return pool[Math.floor(Math.random() * pool.length)];
  };

  function fakeAgentBubble(status: "pending" | "verified" | "failed") {
    const id = `pg_${Date.now()}`;
    const p = getProduct("acer-swift-go-14")!;
    useChat.setState((s) => ({
      messages: [
        ...s.messages,
        {
          id,
          role: "assistant",
          status: "done",
          text: status === "verified" ? `Done: the **${p.name}** is in your cart. I re-checked the cart to confirm.` : status === "failed" ? "The store said yes, but it isn't in your cart, so I won't call that done." : "Adding it now…",
          blocks: [
            {
              kind: "cart_action",
              id: `${id}-cart`,
              action: "add",
              productId: p.id,
              status,
              line: status === "verified" ? { productId: p.id, name: `${p.brand} ${p.name}`, unitPrice: p.price, qty: 1, lineTotal: p.price } : null,
              message: status === "failed" ? "Not found in the cart after the update." : undefined,
            },
          ],
          trace: [
            { callId: "a", name: "check_stock", status: "ok", summary: "in stock (5)", durationMs: 212 },
            { callId: "b", name: "add_to_cart", status: "ok", summary: "store accepted", durationMs: 388 },
            { callId: "c", name: "get_cart", status: status === "failed" ? "ok" : "ok", summary: status === "failed" ? "NOT verified ✕ · 0 items" : "verified ✓ · 1 item", durationMs: 201 },
          ],
        },
      ],
    }));
    show({ kind: "agent", messageId: id });
  }

  const btn = (label: string, onClick: () => void) => (
    <Button size="sm" variant="secondary" onClick={onClick}>
      {label}
    </Button>
  );

  return (
    <section className="mt-8 space-y-5" aria-labelledby="roam-h">
      <h2 id="roam-h" className="font-display text-sm font-semibold uppercase tracking-wider text-muted">
        Roaming, guide & bubbles
      </h2>

      <div>
        <p className="mb-2 text-xs text-muted">
          Position · mode <span className="font-mono text-text">{pos.mode}</span> · anchor <span className="font-mono text-text">{pos.anchorId ?? "—"}</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {btn("Free (home)", () => void pos.goHome())}
          {btn("Follow cursor", () => pos.setFollow(true))}
          {btn("Park ↖", () => void pos.park("tl"))}
          {btn("Park ↗", () => void pos.park("tr"))}
          {btn("Park ↙", () => void pos.park("bl"))}
          {btn("Park ↘", () => void pos.park("br"))}
          {btn("Fly to random anchor", () => {
            const a = randomAnchor();
            if (a) void pos.flyToAnchor(a.el);
          })}
          {btn("Back to stage", () => void pos.flyToAnchor("stage", { size: 200, place: (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; } }))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs text-muted">
          Guide · last decision: <span className="font-mono text-text">{lastDecision || "—"}</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {btn("Fake idle (random anchor)", () => {
            const a = randomAnchor();
            if (a) fire({ kind: "idle", anchor: { id: a.id, topic: a.topic, productId: a.productId } });
          })}
          {btn("Reset guide state", () => useGuide.getState().reset())}
          {btn("Run tour", () => startTour())}
          <Button size="sm" variant={debugOn ? "primary" : "secondary"} onClick={toggleDebug}>
            {debugOn ? "Hide" : "Show"} anchors & placement
          </Button>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs text-muted">Bubble samples</p>
        <div className="flex flex-wrap gap-2">
          {btn("Plain tip", () => show({ kind: "tip", id: `pg-${Date.now()}`, source: "guide", text: "10 h of battery, longer than 60% of the laptops here. That's a full workday." }))}
          {btn("Tip + chips", () =>
            show({ kind: "tip", id: `pg-${Date.now()}`, source: "guide", text: "Want me to compare this with similar laptops?", chips: [{ label: "Compare them", message: "Compare the Swift Go 14 with similar ones", primary: true }, { label: "Cheaper", message: "Find a cheaper alternative to the Swift Go 14" }, { label: "Not now" }] }),
          )}
          {btn("Mini cards", () => show({ kind: "tip", id: `pg-${Date.now()}`, source: "guide", text: "Here are three I'd look at:", productIds: SAMPLE_IDS }))}
          {btn("Prompt (input)", () => show({ kind: "prompt", suggestions: suggestionsFor("/") }, { input: true }))}
          {btn("Cart: pending", () => fakeAgentBubble("pending"))}
          {btn("Cart: verified ✓", () => fakeAgentBubble("verified"))}
          {btn("Cart: failed ✕", () => fakeAgentBubble("failed"))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs text-muted">Sample anchors (rest on one for 1.5 s to trigger a dwell tip)</p>
        <div className="grid grid-cols-3 gap-3">
          {SAMPLE_IDS.map((id) => {
            const p = getProduct(id)!;
            return (
              <div key={id} data-pip-anchor={`pg:card:${id}`} data-pip-topic="product-card" data-pip-product={id} className="overflow-hidden rounded-2xl bg-surface hairline">
                <div className="h-20">
                  <ProductImage product={p} variant="pg" showInitials={false} />
                </div>
                <div className="p-2.5">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="font-mono text-xs text-muted">{formatNPR(p.price)}</p>
                  <p data-pip-anchor={`pg:battery:${id}`} data-pip-topic="spec-battery" data-pip-product={id} className="mt-1 w-fit rounded bg-surface-2 px-1.5 font-mono text-2xs">
                    Battery {p.specs.batteryHours} h
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
