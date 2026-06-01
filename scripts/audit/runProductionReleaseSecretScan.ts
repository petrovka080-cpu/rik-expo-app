import { writeProductionReleaseSecretScan } from "../release/releaseStateCleanupCore";

const report = writeProductionReleaseSecretScan(process.cwd());

console.log(report.final_status);

if (report.final_status !== "GREEN_RELEASE_SECRET_SCAN_READY") {
  process.exitCode = 1;
}
