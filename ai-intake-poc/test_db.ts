import { saveLead } from "./db/sqlite";

saveLead("TEST-001", { hello: "world" });
console.log("✅ wrote test lead");
