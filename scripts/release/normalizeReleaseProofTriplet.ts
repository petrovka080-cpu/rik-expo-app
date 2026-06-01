import { writeReleaseGuardTripletResolution } from "./releaseStateCleanupCore";

const report = writeReleaseGuardTripletResolution(process.cwd());

console.log(report.final_status);

if (report.final_status !== "GREEN_RELEASE_GUARD_TRIPLETS_READY") {
  process.exitCode = 1;
}
