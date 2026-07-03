import { certifyAllEstimateNormBindings10000 } from "../../src/lib/ai/estimateTemplate10000";
import { exitCodeForSummary, writeEstimateNormRuntimeSummary } from "./normRuntimeSummary";

const summary = certifyAllEstimateNormBindings10000();
const summaryFile = writeEstimateNormRuntimeSummary("certifyAllEstimateNormBindings", summary);

console.log(JSON.stringify({ ...summary, summary_file: summaryFile }, null, 2));
process.exitCode = exitCodeForSummary(summary);
