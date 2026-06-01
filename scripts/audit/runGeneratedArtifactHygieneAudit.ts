import {
  writeGeneratedArtifactChurnDiagnosis,
  writeGeneratedArtifactChurnResolution,
  writeGeneratedArtifactHygieneAudit,
} from "../release/releaseStateCleanupCore";

const report = writeGeneratedArtifactHygieneAudit(process.cwd());
writeGeneratedArtifactChurnDiagnosis(process.cwd());
writeGeneratedArtifactChurnResolution(process.cwd());

console.log(report.final_status);

if (report.final_status !== "GREEN_GENERATED_ARTIFACT_HYGIENE_READY") {
  process.exitCode = 1;
}
