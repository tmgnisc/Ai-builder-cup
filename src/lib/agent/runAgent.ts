import type { PipState } from "@/features/companion";
import type { Cart, CartLine } from "@/lib/commerce/schemas";
import { executeTool, type ToolContext, type ToolInput, type ToolName, type ToolOutcome } from "./tools";
import type { AgentEvent, AgentMemory, AgentRequest, Block, UIAction } from "./types";

/**
 * Agent runtime: observe → understand → decide → act → verify → adapt.
 *
 * An Agent (mock or Gemini) decides what to do and asks the runtime to run tools via
 * `io.call`. The runtime validates, times and traces every call, and enforces the verify
 * rule itself: after add_to_cart / remove_from_cart it always calls get_cart and reports
 * whether the change is really there. The agent cannot skip this.
 */

export interface Verification {
  verified: boolean;
  /** The cart line as returned by get_cart (null when absent). */
  line: CartLine | null;
}

export type CallResult<N extends ToolName> = ToolOutcome<N> & { verification?: Verification };

export interface AgentIO {
  state(state: PipState, caption?: string): void;
  /** Starts an assistant message and returns its id. */
  message(): string;
  /** Streams text into a message, token by token. */
  say(messageId: string, text: string): Promise<void>;
  call<N extends ToolName>(messageId: string, name: N, input: ToolInput<N>): Promise<CallResult<N>>;
  block(messageId: string, block: Block): void;
  ui(action: UIAction): void;
  remember(memory: AgentMemory): void;
  /** Demo pacing so each Pip state is visible; scaled by `pace` (0 in tests). */
  pause(ms: number): Promise<void>;
  readonly signal: AbortSignal;
}

export interface Agent {
  readonly name: string;
  run(request: AgentRequest, io: AgentIO): Promise<void>;
}

/** States that return to idle by themselves (see states.ts `settle`), so the runtime leaves them alone. */
const SELF_SETTLING: PipState[] = ["greeting", "success", "error", "idle", "sleeping"];

export interface RunOptions {
  agent: Agent;
  ctx: ToolContext;
  /** Multiplier for pauses and token streaming. 1 = demo pacing, 0 = instant. */
  pace?: number;
  signal?: AbortSignal;
}

let idCounter = 0;
const newId = (prefix: string) => `${prefix}_${Date.now().toString(36)}${(idCounter++).toString(36)}`;

export async function* runAgent(request: AgentRequest, { agent, ctx, pace = 1, signal = new AbortController().signal }: RunOptions): AsyncGenerator<AgentEvent> {
  // A small push/pull channel: the agent pushes events, this generator yields them in order.
  const queue: AgentEvent[] = [];
  let wake: (() => void) | null = null;
  let finished = false;
  let lastState: PipState | null = null;

  const push = (ev: AgentEvent) => {
    if (signal.aborted) return;
    if (ev.type === "state_change") lastState = ev.state;
    queue.push(ev);
    wake?.();
  };

  const sleep = (ms: number) =>
    new Promise<void>((resolve) => {
      const t = ms * pace;
      if (t <= 0 || signal.aborted) return resolve();
      const id = setTimeout(resolve, t);
      signal.addEventListener("abort", () => (clearTimeout(id), resolve()), { once: true });
    });

  const io: AgentIO = {
    signal,
    state: (state, caption) => push({ type: "state_change", state, caption }),
    message: () => {
      const messageId = newId("msg");
      push({ type: "message_start", messageId });
      return messageId;
    },
    say: async (messageId, text) => {
      // Word-ish tokens keep markdown (**bold**) intact across deltas.
      const tokens = text.match(/\S+\s*|\s+/g) ?? [text];
      for (const delta of tokens) {
        if (signal.aborted) return;
        push({ type: "text_delta", messageId, delta });
        await sleep(16 + Math.min(40, delta.length * 4));
      }
    },
    call: async (messageId, name, input) => {
      const callId = newId("call");
      push({ type: "tool_call", messageId, callId, name, input });
      const outcome = await executeTool(name, input, ctx);
      push({
        type: "tool_result",
        messageId,
        callId,
        name,
        ok: outcome.ok,
        summary: outcome.summary,
        durationMs: outcome.durationMs,
        ...(outcome.ok ? {} : { error: outcome.error }),
      });
      if (!outcome.ok || (name !== "add_to_cart" && name !== "remove_from_cart")) return outcome;

      // ── Verify (runtime-enforced) ──
      const productId = (input as { productId: string }).productId;
      const verifyId = newId("call");
      push({ type: "tool_call", messageId, callId: verifyId, name: "get_cart", input: {} });
      const cart = await executeTool("get_cart", {}, ctx);
      let verification: Verification;
      if (!cart.ok) {
        verification = { verified: false, line: null };
      } else {
        const line = cart.output.lines.find((l) => l.productId === productId) ?? null;
        // What the store *claimed* the cart looks like after the mutation…
        const claimed = (outcome.output as { cart: Cart }).cart.lines.find((l) => l.productId === productId) ?? null;
        // …must match what a fresh read actually shows.
        verification =
          name === "add_to_cart" ? { verified: !!line && !!claimed && line.qty === claimed.qty, line } : { verified: !line, line };
      }
      push({
        type: "tool_result",
        messageId,
        callId: verifyId,
        name: "get_cart",
        ok: cart.ok,
        summary: cart.ok ? `${verification.verified ? "verified ✓" : "NOT verified ✕"} · ${cart.summary}` : cart.summary,
        durationMs: cart.durationMs,
        ...(cart.ok ? {} : { error: cart.error }),
      });
      return { ...outcome, verification };
    },
    block: (messageId, block) => push({ type: "block", messageId, block }),
    ui: (action) => push({ type: "ui", action }),
    remember: (memory) => push({ type: "memory", memory }),
    pause: sleep,
  };

  const run = agent
    .run(request, io)
    .catch((err: unknown) => {
      const message = err instanceof Error ? err.message : "Unknown error";
      push({ type: "state_change", state: "error", caption: "Something went wrong" });
      push({ type: "error", message });
    })
    .finally(() => {
      finished = true;
      wake?.();
    });

  while (true) {
    if (queue.length) {
      yield queue.shift()!;
      continue;
    }
    if (finished || signal.aborted) break;
    await new Promise<void>((resolve) => (wake = resolve));
    wake = null;
  }
  await run;
  if (signal.aborted) return;
  if (lastState && !SELF_SETTLING.includes(lastState)) yield { type: "state_change", state: "idle" };
  yield { type: "done" };
}
