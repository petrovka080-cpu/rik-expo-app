import { buildEstimateNormImportPlan } from "../../src/lib/ai/estimateTemplate10000";
import { exitCodeForSummary, writeEstimateNormRuntimeSummary } from "./normRuntimeSummary";

const mode = process.argv.includes("--verify") ? "verify" : "dry-run";
const summary = buildEstimateNormImportPlan({ mode });
const summaryFile = writeEstimateNormRuntimeSummary("importEstimateNorms", summary);

console.log(JSON.stringify({ ...summary, summary_file: summaryFile }, null, 2));
process.exitCode = exitCodeForSummary(summary);
