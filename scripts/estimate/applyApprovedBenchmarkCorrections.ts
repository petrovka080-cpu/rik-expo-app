import { readFileSync } from "node:fs";

import { applyApprovedBenchmarkCorrections } from "./goldenBenchmarkCore";

export { applyApprovedBenchmarkCorrections } from "./goldenBenchmarkCore";

if (require.main === module) {
  const filePath = process.argv.find((item) => item.startsWith("--corrections="))?.slice("--corrections=".length);
  if (!filePath) throw new Error("usage: tsx scripts/estimate/applyApprovedBenchmarkCorrections.ts --corrections=<file.json>");
  const parsed = JSON.parse(readFileSync(filePath, "utf8")) as Parameters<typeof applyApprovedBenchmarkCorrections>[0];
  console.info(JSON.stringify(applyApprovedBenchmarkCorrections(parsed), null, 2));
}
