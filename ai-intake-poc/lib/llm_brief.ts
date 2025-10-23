import OpenAI from "openai";
import { SalesBriefSchema } from "../schema/leads";
import "dotenv/config";

export async function briefFromExtracted(extracted: any) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const sys = "Summarize for a car salesperson in concise bullets. Output ONLY JSON matching the schema hint. Keep it < 120 words total.";
  const hint = {
    bullets: ["short strings (2-8 items)"],
    first_question: "string",
    vehicle_recos: [{ name: "string", why: "string" }],
    tone: "string"
  };

  const user = [
    "Extracted intake object (JSON):",
    JSON.stringify(extracted),
    "",
    "Return JSON with keys exactly: bullets, first_question, vehicle_recos, tone",
    `Schema hint: ${JSON.stringify(hint)}`
  ].join("\n");

  const r = await client.chat.completions.create({
    model,
    temperature: 0.2,
    messages: [
      { role: "system", content: sys },
      { role: "user", content: user }
    ]
  });

  let text = r.choices?.[0]?.message?.content || "{}";
  text = text.replace(/```json/gi, "").replace(/```/g, "").trim();

  const parsed = JSON.parse(text);
  return SalesBriefSchema.parse(parsed);
}
