import { writePreflight } from "./iosTestFlightInternalQaCore";

const report = writePreflight(process.cwd());
console.log(JSON.stringify(report, null, 2));

if (report.final_status !== "GREEN_IOS_TESTFLIGHT_INTERNAL_QA_PREFLIGHT_READY") {
  process.exitCode = 1;
}
