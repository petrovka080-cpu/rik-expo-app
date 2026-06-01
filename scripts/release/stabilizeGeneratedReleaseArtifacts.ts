import { writeGeneratedArtifactChurnResolution } from "./releaseStateCleanupCore";

const report = writeGeneratedArtifactChurnResolution(process.cwd());

console.log(report.final_status);

if (report.final_status !== "GREEN_GENERATED_ARTIFACT_CHURN_RESOLVED") {
  process.exitCode = 1;
}
