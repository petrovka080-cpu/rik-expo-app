import {
  writeFinalBuildProof,
  writePrebuildProof,
} from "./iosTestFlightInternalQaCore";

const prebuildOnly = process.argv.includes("--prebuild-only");
const report = prebuildOnly ? writePrebuildProof(process.cwd()) : writeFinalBuildProof(process.cwd());
console.log(JSON.stringify(report, null, 2));

const greenStatuses = new Set([
  "GREEN_IOS_TESTFLIGHT_INTERNAL_QA_PREBUILD_READY",
  "GREEN_IOS_TESTFLIGHT_INTERNAL_QA_BUILD_READY",
]);

if (!greenStatuses.has(String(report.final_status))) {
  process.exitCode = 1;
}
