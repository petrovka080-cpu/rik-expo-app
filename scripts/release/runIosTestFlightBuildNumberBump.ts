import { runBuildNumberBump } from "./iosTestFlightInternalQaCore";

const report = runBuildNumberBump(process.cwd());
console.log(JSON.stringify(report, null, 2));

if (report.build_number_incremented !== true || report.marketing_version_changed === true) {
  process.exitCode = 1;
}
