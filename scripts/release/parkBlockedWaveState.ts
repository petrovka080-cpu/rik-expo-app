import { writeParkedWaveState } from "./releaseStateCleanupCore";

const report = writeParkedWaveState(process.cwd());

console.log(report.final_status);

if (report.final_status !== "GREEN_NON_CURRENT_WAVES_PARKED") {
  process.exitCode = 1;
}
