import { resolveChaos } from "@/lib/commerce/chaos";
import { getSessionId } from "@/lib/commerce/http";
import { createAgent } from "@/lib/agent/geminiAgent";
import { runAgent } from "@/lib/agent/runAgent";
import { AgentRequestSchema, type AgentEvent } from "@/lib/agent/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/agent → NDJSON stream of AgentEvents (one JSON object per line).
 * Body: { message, memory, context }. The server is stateless: memory round-trips via the client.
 * Agent selection lives in `createAgent()` (mock by default; Gemini when configured).
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = undefined;
  }
  const parsed = AgentRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: { code: "INVALID_INPUT", message: parsed.error.issues.map((i) => i.message).join("; ") } }, { status: 400 });
  }

  const sessionId = await getSessionId();
  const chaos = resolveChaos(req);
  const pace = Number(process.env.PERSONA_AGENT_PACE ?? req.headers.get("x-persona-pace") ?? 1);
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (ev: AgentEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(ev)}\n`));
      try {
        for await (const ev of runAgent(parsed.data, {
          agent: createAgent(),
          ctx: { sessionId, chaos },
          pace: Number.isFinite(pace) ? Math.max(0, pace) : 1,
          signal: req.signal,
        })) {
          send(ev);
        }
      } catch (err) {
        send({ type: "state_change", state: "error", caption: "Something went wrong" });
        send({ type: "error", message: err instanceof Error ? err.message : "Agent failed" });
        send({ type: "done" });
      } finally {
        try {
          controller.close();
        } catch {
          // client disconnected
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store, no-transform",
      "x-accel-buffering": "no",
    },
  });
}
