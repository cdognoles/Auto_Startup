import OpenAI from "openai";
import { ExtractedSchema } from "../schema/leads";
import "dotenv/config";

const SHAPE_HINT = {
  vehicles: [{ make: "string|null", model: "string|null", year: "number|null", trim: "string|null" }],
  budget: { type: "monthly|total|unknown", value: "number|null", currency: "USD", raw: "string|null" },
  timeline: { explicit: "string|null", inferred: "string|null" },
  trade_in: { has_trade: "boolean", desc: "string|null", vin: "string|null", mileage: "number|null", condition: "string|null", neg_equity_hint: "boolean" },
  finance: { preference: "Finance|Cash|Unknown", credit_anxiety: "boolean" },
  context: { life_events: ["strings"], priorities: ["strings"], passengers: "number|null", usage: ["strings"] },
  risks: ["strings"]
};

export async function extractFromRaw(compiledText: string) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  // try twice: normal → strict JSON-only
  const first = await callOnce(client, model, compiledText, false);
  const parsed1 = safeParse(first);
  if (parsed1) return parsed1;

  const second = await callOnce(client, model, compiledText, true);
  const parsed2 = safeParse(second);
  if (parsed2) return parsed2;

  throw new Error("Extractor returned invalid JSON twice");
}

async function callOnce(client: OpenAI, model: string, text: string, jsonOnly: boolean) {
  const system = jsonOnly
    ? "You extract car-shopping intent. Output ONLY valid JSON. No prose. Keys must match the schema hint."
    : "You extract car-shopping intent. Return JSON matching the schema hint.";

  const user = [
    "Conversation (free text):",
    text,
    "",
    `Return JSON with keys exactly: ${Object.keys(SHAPE_HINT).join(", ")}`,
    `Schema hint: ${JSON.stringify(SHAPE_HINT)}`
  ].join("\n");

  const r = await client.chat.completions.create({
    model,
    temperature: 0,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user }
    ]
  });

  return r.choices?.[0]?.message?.content ?? "{}";
}

function safeParse(s: string) {
  // strip common code-fence patterns
  const body = s.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    const obj = JSON.parse(body);
    // validate + fill defaults
    return ExtractedSchema.parse(obj);
  } catch {
    return null;
  }
}
