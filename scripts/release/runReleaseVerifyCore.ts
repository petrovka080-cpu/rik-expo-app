import { writeReleaseVerifyCore } from "./releaseStateCleanupCore";
import { RELEASE_VERIFY_CORE_GREEN_STATUS } from "./releaseTargetScope";

const json = process.argv.includes("--json");
const report = writeReleaseVerifyCore(process.cwd());

if (json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(report.final_status);
}

if (report.final_status !== RELEASE_VERIFY_CORE_GREEN_STATUS) {
  process.exitCode = 1;
}
