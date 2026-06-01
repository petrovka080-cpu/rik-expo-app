import { writeProductionReleaseStateCleanupCloseoutProof } from "./releaseStateCleanupCore";

const result = writeProductionReleaseStateCleanupCloseoutProof(process.cwd());

console.log(result.matrix.final_status);

if (result.matrix.final_status !== "GREEN_PRODUCTION_RELEASE_STATE_CLEANUP_CLOSEOUT_READY") {
  process.exitCode = 1;
}
