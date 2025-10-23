import { z } from "zod";

/**
 * RAW SECTION = What came directly from the user interaction
 * ----------------------------------------------------------
 * This includes:
 *  - Chat messages (the transcript of user & AI)
 *  - A small "form" object with extra quick-choice fields
 *  - A compiled_text version (one big string) used later by the LLM extractor
 */

/** A single message in the chat transcript */
export const RawMessageSchema = z.object({
  role: z.enum(["user", "ai"]),     // only raw human/assistant messages, not internal system logs
  text: z.string().min(1),          // must contain at least 1 character
  ts: z.string().optional(),        // optional timestamp if we decide to add it later
});

/** Optional small structured inputs captured outside of the chat */
export const RawFormSchema = z.object({
  timeline: z.string().optional(),          // example: "0-30 days", "Browsing", etc.
  finance_pref: z.string().optional(),      // example: "Finance", "Cash"
  consent_soft_credit: z.boolean().optional().default(false),
});

/** All raw intake combined */
export const RawInputSchema = z.object({
  messages: z.array(RawMessageSchema).min(1),    // must have at least one chat message
  compiled_text: z.string().min(1),              // full text version to send to LLM
  form: RawFormSchema.default({ consent_soft_credit: false }),
               // form is optional, default to {}
});
/** ---------- EXTRACTED SECTION (from LLM) ---------- */

/** A single interpreted vehicle intent */
export const ExtractedVehicleSchema = z.object({
  make: z.string().optional().nullable(),     // "Toyota"
  model: z.string().optional().nullable(),    // "RAV4"
  year: z.number().int().optional().nullable(), // 2022
  trim: z.string().optional().nullable(),     // "XSE"
});
/** Extracted budget intent */
export const ExtractedBudgetSchema = z.object({
  type: z.enum(["monthly", "total", "unknown"]).default("unknown"),
  value: z.number().positive().optional().nullable(),
  currency: z.string().default("USD"),
  raw: z.string().optional().nullable(),
});

/** Extracted timeline (explicit = what user said, inferred = what LLM deduced) */
export const ExtractedTimelineSchema = z.object({
  explicit: z.string().optional().nullable(),
  inferred: z.string().optional().nullable(),
});

/** Extracted trade-in info */
export const ExtractedTradeInSchema = z.object({
  has_trade: z.boolean().default(false),
  desc: z.string().optional().nullable(),
  vin: z.string().optional().nullable(),
  mileage: z.number().int().optional().nullable(),
  condition: z.string().optional().nullable(),
  neg_equity_hint: z.boolean().default(false),
});

/** Extracted finance info */
export const ExtractedFinanceSchema = z.object({
  preference: z.enum(["Finance", "Cash", "Unknown"]).default("Unknown"),
  credit_anxiety: z.boolean().default(false),
});

/** Extracted contextual signals (high-level intent/contextual inference) */
export const ExtractedContextSchema = z.object({
  life_events: z.array(z.string()).default([]),
  priorities: z.array(z.string()).default([]),    // e.g. ["safety","awd","mpg"]
  passengers: z.number().int().optional().nullable(),
  usage: z.array(z.string()).default([]),         // e.g. ["commute","towing","college trips"]
});

/** Final "Extracted" container (not yet linked to Lead) */
export const ExtractedSchema = z.object({
  vehicles: z.array(ExtractedVehicleSchema).default([]),
  budget: ExtractedBudgetSchema.default({ type:"unknown", currency:"USD" }),
  timeline: ExtractedTimelineSchema.default({}),
  trade_in: ExtractedTradeInSchema.default({ has_trade:false, neg_equity_hint:false }),
  finance: ExtractedFinanceSchema.default({ preference:"Unknown", credit_anxiety:false }),
  context: ExtractedContextSchema.default({ life_events:[], priorities:[], usage:[] }),
  risks: z.array(z.string()).default([]),
});

export type Extracted = z.infer<typeof ExtractedSchema>;

/** ---------- SALES BRIEF (AI summary for salesperson) ---------- */

export const SalesRecoSchema = z.object({
  name: z.string(),     // e.g. "RAV4 Hybrid XLE AWD"
  why: z.string(),      // short rationale
});

export const SalesBriefSchema = z.object({
  bullets: z.array(z.string()).min(2).max(8),
  first_question: z.string(),
  vehicle_recos: z.array(SalesRecoSchema).min(1).max(3),
  tone: z.string(),     // "reassuring", "payment-sensitive", etc.
});

export type SalesBrief = z.infer<typeof SalesBriefSchema>;
/** ---------- CREDIT (soft-pull / dummy / vendor) ---------- */

export const CreditSchema = z.object({
  consent: z.boolean().default(false),                   // user explicitly agreed or not
  mode: z.enum(["dummy", "700credit", "isoftpull"]).default("dummy"),
  band: z.string().optional().nullable(),                // e.g. "680-699"
  soft_pull_id: z.string().optional().nullable(),
  pulled_at: z.string().optional().nullable(),           // ISO datetime string
});


/** ---------- META (system/tracking details) ---------- */

export const MetaSchema = z.object({
  created_at: z.string(),                                // ISO string, set server-side
  ua: z.string().optional().nullable(),                  // user agent
  ip: z.string().optional().nullable(),
  page_url: z.string().optional().nullable(),
  source: z.string().default("chat"),                    // "chat" | "iframe" | "kiosk" etc
  finish_mode: z.enum(["explicit", "auto"]).default("explicit"),
});
/** ---------- FINAL LEAD OBJECT ---------- */

export const LeadSchema = z.object({
  id: z.string(),                           // ULID or UUID — we'll generate at write-time
  raw: RawInputSchema,
  extracted: ExtractedSchema,
  sales_brief: SalesBriefSchema,
  credit: CreditSchema,
  meta: MetaSchema,
});

export type Lead = z.infer<typeof LeadSchema>;


