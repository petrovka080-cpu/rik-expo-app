import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  buildExpertAdjudicationQueue,
  compareEstimateToGoldenBenchmark,
  loadGoldenBenchmarkCases,
} from "./goldenBenchmarkCore";

export { buildExpertAdjudicationQueue } from "./goldenBenchmarkCore";

if (require.main === module) {
  const comparisons = loadGoldenBenchmarkCases().map((item) => compareEstimateToGoldenBenchmark(item));
  const queue = buildExpertAdjudicationQueue(comparisons.flatMap((item) => item.deviations));
  const outPath = path.join("data", "estimate-benchmarks", "expert-adjudications.json");
  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(queue, null, 2)}\n`, "utf8");
  console.info(JSON.stringify({
    expert_adjudication_queue_created: true,
    benchmark_failures_not_silently_ignored: true,
    entries: queue.entries.length,
    path: outPath,
  }, null, 2));
}
