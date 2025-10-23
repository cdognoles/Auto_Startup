import "dotenv/config";
import { extractFromRaw } from "./lib/llm_extract";

(async () => {
  const example = "Lease ends November. Looking at RAV4 or CR-V. Under 600/mo. Have a BMW to trade.";
  const result = await extractFromRaw(example);
  console.log(JSON.stringify(result, null, 2));
})();
