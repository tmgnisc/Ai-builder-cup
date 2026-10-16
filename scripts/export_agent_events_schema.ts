import fs from "node:fs";
import path from "node:path";
import { AgentEventSchema } from "../src/lib/agent/types";
import { PIP_STATES } from "../src/components/companion/states";

const outDir = path.resolve(__dirname, "../backend/tests/fixtures");
fs.mkdirSync(outDir, { recursive: true });

interface ZodFieldSchema {
  isOptional?: () => boolean;
  safeParse: (v: unknown) => { success: boolean };
  value?: string;
}

interface ZodOptionSchema {
  shape: Record<string, ZodFieldSchema>;
}

// Extract metadata from Zod schema definitions
const eventSchemas = (AgentEventSchema.def.options as ZodOptionSchema[]).map((option) => {
  const shape = option.shape;
  const typeLiteral = shape.type.value ?? "";
  const properties: Record<string, { required: boolean; type?: string }> = {};

  for (const [key, value] of Object.entries(shape)) {
    const isOptional = typeof value.isOptional === "function" ? value.isOptional() : value.safeParse(undefined).success;
    properties[key] = {
      required: !isOptional,
    };
  }

  return {
    type: typeLiteral,
    required: Object.entries(properties)
      .filter(([, v]) => v.required)
      .map(([k]) => k),
    properties: Object.keys(properties),
  };
});

const schemaContract = {
  discriminator: AgentEventSchema.def.discriminator,
  eventTypes: eventSchemas.map((s) => s.type),
  events: eventSchemas,
  pipStates: PIP_STATES,
  blockKinds: ["product_carousel", "comparison", "cart_action", "clarify"],
  uiActionTypes: [
    "highlight",
    "move_to",
    "scroll_to",
    "set_filters",
    "open_drawer",
    "open_compare",
    "cart_updated",
    "navigate",
  ],
};

fs.writeFileSync(
  path.join(outDir, "agent_events_schema.json"),
  JSON.stringify(schemaContract, null, 2),
  "utf-8"
);

console.log(
  `Exported AgentEvent contract with ${eventSchemas.length} events: ${schemaContract.eventTypes.join(", ")}`
);
