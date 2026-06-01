import { writeReleaseVerifyOwner } from "./releaseStateCleanupCore";

const json = process.argv.includes("--json");
const report = writeReleaseVerifyOwner(process.cwd());

if (json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(report.final_status);
}

process.exitCode = 1;
