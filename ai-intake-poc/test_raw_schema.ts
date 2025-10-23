

import { RawInputSchema } from "./schema/leads";
import { ExtractedVehicleSchema } from "./schema/leads";
import { ExtractedSchema } from "./schema/leads";
import { SalesBriefSchema } from "./schema/leads";
import { CreditSchema, MetaSchema } from "./schema/leads";
import { LeadSchema } from "./schema/leads";

console.log("LEAD SAMPLE:",
  LeadSchema.parse({
    id: "TEST-123",
    raw: {
      messages: [{ role:"user", text:"Looking for a RAV4 hybrid" }],
      compiled_text: "Looking for a RAV4 hybrid",
      form: {}
    },
    extracted: {},
    sales_brief: {
      bullets:["Wants hybrid","Shopping soon"],
      first_question:"Are you open to AWD hybrids?",
      vehicle_recos:[{name:"RAV4 Hybrid", why:"fits request"}],
      tone:"neutral"
    },
    credit: { consent:false },
    meta: { created_at:new Date().toISOString(), source:"chat", finish_mode:"explicit" }
  })
);


console.log("CREDIT SAMPLE:",
  CreditSchema.parse({ consent:true, mode:"dummy", band:"680-699" })
);

console.log("META SAMPLE:",
  MetaSchema.parse({
    created_at:new Date().toISOString(),
    source:"chat",
    finish_mode:"auto"
  })
);

console.log("SALES BRIEF SAMPLE:",
  SalesBriefSchema.parse({
    bullets:["Needs safe AWD", "Payment cap near 600/mo"],
    first_question:"Would hybrid be an option to reduce fuel cost?",
    vehicle_recos:[{name:"RAV4 Hybrid XLE AWD", why:"fits safety + cost"}],
    tone:"reassuring"
  })
);

console.log("EXTRACT TEST:",
  ExtractedVehicleSchema.parse({ make:"Toyota", model:"RAV4" })
);
console.log("EXTRACT SAMPLE:",
  ExtractedSchema.parse({})
);

const example = {
  messages: [{ role:"user", text:"Looking for a RAV4" }],
  compiled_text: "Looking for a RAV4",
  form: { timeline:"0-30 days" }
};

try {
  const result = RawInputSchema.parse(example);
  console.log("✅ VALID:", result);
} catch (err) {
  console.log("❌ ERROR:", err);
}
