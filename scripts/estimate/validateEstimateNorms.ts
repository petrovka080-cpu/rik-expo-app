import { validateEstimateNormKnowledgeBase } from "../../src/lib/ai/estimateTemplate10000";
import { exitCodeForSummary, writeEstimateNormRuntimeSummary } from "./normRuntimeSummary";

const summary = validateEstimateNormKnowledgeBase();
const summaryFile = writeEstimateNormRuntimeSummary("validateEstimateNorms", summary);

console.log(JSON.stringify({ ...summary, summary_file: summaryFile }, null, 2));
process.exitCode = exitCodeForSummary(summary);
