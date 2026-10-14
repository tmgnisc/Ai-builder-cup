import { getChaosHeader } from "@/lib/commerce/client";
import { AgentEventSchema, type AgentEvent, type AgentRequest } from "./types";

/**
 * Streams AgentEvents from /api/agent. Each NDJSON line is validated with zod; malformed
 * lines are dropped (and reported) rather than crashing the UI.
 */
export async function* streamAgent(request: AgentRequest, signal: AbortSignal): AsyncGenerator<AgentEvent> {
  const headers = new Headers({ "content-type": "application/json" });
  const chaos = getChaosHeader();
  if (chaos !== null) headers.set("x-persona-chaos", chaos);

  const res = await fetch("/api/agent", { method: "POST", headers, body: JSON.stringify(request), signal });
  if (!res.ok || !res.body) throw new Error(`Agent request failed (${res.status})`);

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      let nl: number;
      while ((nl = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line) continue;
        const parsed = AgentEventSchema.safeParse(JSON.parse(line));
        if (parsed.success) yield parsed.data;
        else console.warn("[agent] dropped malformed event", parsed.error.issues[0]);
      }
    }
  } finally {
    reader.releaseLock();
  }
}
