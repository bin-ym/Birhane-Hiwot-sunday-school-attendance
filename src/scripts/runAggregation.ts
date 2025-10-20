// src/scripts/runAggregation.ts
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" }); // ✅ Loads environment variables

import { formatEthiopianDate } from "@/lib/utils";
import { aggregateAttendance } from "@/lib/aggregateAttendance";

async function run() {
  const date = formatEthiopianDate(new Date());
  console.log(`Aggregating attendance for ${date}...`);
  const result = await aggregateAttendance(date);
  console.log(`✅ Aggregation complete: ${JSON.stringify(result)}`);
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Aggregation failed:", err);
    process.exit(1);
  });
