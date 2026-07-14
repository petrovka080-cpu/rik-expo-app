import { runEstimateRegressionSentinelCli } from "./runEstimateRegressionSentinel";

const { summary, outPath } = runEstimateRegressionSentinelCli();
console.log(JSON.stringify({ ...summary, artifact: outPath, caseResults: undefined }, null, 2));
if (summary.blockers.length > 0) process.exit(1);
