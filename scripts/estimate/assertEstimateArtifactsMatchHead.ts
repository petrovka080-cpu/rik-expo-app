import { runEstimateArtifactLineageCli } from "./auditEstimateArtifactLineage";

const { summary, outPath } = runEstimateArtifactLineageCli();
console.log(JSON.stringify({ ...summary, artifact: outPath }, null, 2));
if (summary.blockers.length > 0) process.exit(1);
