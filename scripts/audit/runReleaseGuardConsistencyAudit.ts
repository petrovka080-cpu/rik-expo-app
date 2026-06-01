import {
  writeReleaseGuardConsistencyAudit,
  writeReleaseGuardGreenWithoutFailuresDiagnosis,
  writeReleaseGuardTripletResolution,
} from "../release/releaseStateCleanupCore";

const report = writeReleaseGuardConsistencyAudit(process.cwd());
writeReleaseGuardGreenWithoutFailuresDiagnosis(process.cwd());
writeReleaseGuardTripletResolution(process.cwd());

console.log(report.final_status);

if (report.final_status !== "GREEN_RELEASE_GUARD_CONSISTENCY_READY") {
  process.exitCode = 1;
}
