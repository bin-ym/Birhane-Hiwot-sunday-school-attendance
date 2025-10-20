// src/scripts/runAggregation.ts
import { formatEthiopianDate } from "@/lib/utils";
import { aggregateAttendance } from "@/lib/aggregateAttendance";

async function run() {
  setInterval(async () => {
    const date = formatEthiopianDate(new Date());
    console.log(`Aggregating attendance for ${date}`);
    const result = await aggregateAttendance(date);
    console.log(`Aggregation complete: ${JSON.stringify(result)}`);
  }, 60 * 60 * 1000); // Every hour
}

run().catch(console.error);