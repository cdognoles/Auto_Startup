console.log("SERVER BOOTING...");

import express from "express";
import { getLead, updateLead } from "../db/sqlite";
import "dotenv/config";
import { extractFromRaw } from "../lib/llm_extract";
import { briefFromExtracted } from "../lib/llm_brief";


const app = express();
app.use(express.json()); // allow JSON request bodies

app.get("/", (_req, res) => {
  res.send("AI Intake POC API is running");
});

import { RawInputSchema } from "../schema/leads";
import { saveLead } from "../db/sqlite";
import { randomUUID } from "crypto";

app.post("/intake/raw", (req, res) => {
    console.log("HIT /intake/raw", new Date().toISOString(), "body:", req.headers["content-type"]);
    try {
    // 1) Validate incoming body
    const parsed = RawInputSchema.parse(req.body);

    // 2) Generate ID
    const id = randomUUID();

    // 3) Save to DB (store RAW for now — no extracted or brief yet)
    saveLead(id, {
      raw: parsed,
      stage: "raw-only"
    });

    // 4) Respond
    res.json({ ok: true, id });

  } catch (err: any) {
    res.status(400).json({
      ok: false,
      error: err.message || "invalid input"
    });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});

// Very simple stub extractor (no LLM yet)
// Uses compiled_text to fill a few fields for demo purposes.
function stubExtract(compiledText: string) {
  // naive model detection (just to prove pipeline)
  const lower = compiledText.toLowerCase();
  const vehicles = [];
  if (lower.includes("rav4")) vehicles.push({ make: "Toyota", model: "RAV4", year: null, trim: null });
  if (lower.includes("cr-v") || lower.includes("crv")) vehicles.push({ make: "Honda", model: "CR-V", year: null, trim: null });

  const extracted = {
    vehicles,
    budget: { type: "unknown", value: null, currency: "USD", raw: null },
    timeline: { explicit: null, inferred: null },
    trade_in: { has_trade: false, desc: null, vin: null, mileage: null, condition: null, neg_equity_hint: false },
    finance: { preference: "Unknown", credit_anxiety: false },
    context: { life_events: [], priorities: [], passengers: null, usage: [] },
    risks: []
  };

    const first = vehicles.at(0);                         // may be undefined
    const firstName =
    first && (first.make || first.model)
        ? `${first.make ?? ""} ${first.model ?? ""}`.trim()
        : null;

    const sales_brief = {
    bullets: [
        vehicles.length
        ? `Interested in: ${vehicles
            .map(v => `${v.make ?? ""} ${v.model ?? ""}`.trim())
            .filter(s => s.length > 0)
            .join(", ")}`
        : "Vehicle intent not clear yet",
        "Payment sensitivity unknown (no budget parsed)"
    ],
    first_question: "Do you have a monthly payment target or a total budget in mind?",
    vehicle_recos: firstName
        ? [{ name: firstName, why: "Matches stated interest" }]
        : [{ name: "Honda CR-V EX", why: "Great all-rounder; safe/reliable" }],
    tone: "neutral, helpful"
    };


  return { extracted, sales_brief };
}

app.post("/intake/extract/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const row = getLead(id);
    if (!row) return res.status(404).json({ ok: false, error: "not found" });

    const current = row.payload || {};
    const compiled = current?.raw?.compiled_text;
    if (!compiled || typeof compiled !== "string" || compiled.trim().length === 0) {
      return res.status(400).json({ ok: false, error: "lead has no raw.compiled_text to extract from" });
    }

    // 🔹 Run LLM extraction (structured fields)
    const extracted = await extractFromRaw(compiled);

    // 🔹 Generate salesperson brief from extracted
    const sales_brief = await briefFromExtracted(extracted);

    // 🔹 Merge and persist
    const updated = { ...current, extracted, sales_brief, stage: "extracted" };
    updateLead(id, updated);

    res.json({ ok: true, id, stage: "extracted" });
  } catch (err: any) {
    console.error("EXTRACT ERR:", err?.message || err);
    res.status(500).json({ ok: false, error: err?.message || "extract failed" });
  }
});
