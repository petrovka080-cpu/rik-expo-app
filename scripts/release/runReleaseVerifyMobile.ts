import { writeReleaseVerifyMobile } from "./releaseStateCleanupCore";

const json = process.argv.includes("--json");
const report = writeReleaseVerifyMobile(process.cwd());

if (json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(report.final_status);
}

process.exitCode = 1;
