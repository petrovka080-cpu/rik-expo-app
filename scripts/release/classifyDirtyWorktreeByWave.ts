import { writeDirtyScopeArtifacts } from "./releaseStateCleanupCore";

const report = writeDirtyScopeArtifacts(process.cwd());

console.log(report.final_status);

if (report.final_status !== "GREEN_CLEAN_WORKTREE" && report.final_status !== "READY_FOR_CLOSEOUT_COMMIT") {
  process.exitCode = 1;
}
