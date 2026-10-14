import { mockAgent } from "./mockAgent";
import { toolDeclarations } from "./tools";
import type { Agent, AgentIO } from "./runAgent";
import type { AgentRequest } from "./types";

/**
 * Gemini adapter (stub). Same `Agent` interface as the mock, so swapping it in is a
 * one-line change in `createAgent()`.
 *
 * Intended loop (implement when wiring the real model):
 *   1. io.state("thinking"); send system prompt + memory + context + user message with
 *      `tools: [{ functionDeclarations: toolDeclarations() }]`.
 *   2. For each functionCall part: map tool name → Pip state (search_products → "searching",
 *      compare_products → "comparing", add/remove_to_cart → "acting"), then
 *      `await io.call(messageId, name, args)`. The runtime validates args with zod, traces the
 *      call and enforces get_cart verification for cart mutations; feed `CallResult`
 *      (including `verification`) back as a functionResponse.
 *   3. Stream text parts with io.say(); emit product_carousel / comparison / cart_action
 *      blocks from tool results (never from model-generated numbers).
 *   4. Final state: "success" only if the runtime reported `verification.verified`.
 */
export const geminiAgent: Agent = {
  name: "gemini",
  async run(_req: AgentRequest, io: AgentIO) {
    void toolDeclarations; // ready for the request body
    const msg = io.message();
    io.state("error", "Gemini not wired yet");
    await io.say(msg, "The Gemini agent isn't connected yet. Set PERSONA_AGENT=mock (the default) to use the built-in agent.");
  },
};

/** The one place that picks the agent implementation. */
export function createAgent(): Agent {
  return process.env.PERSONA_AGENT === "gemini" && process.env.GEMINI_API_KEY ? geminiAgent : mockAgent;
}
