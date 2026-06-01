import { writeReleaseStateCleanupCommitBuckets } from "./releaseStateCleanupCore";

const report = writeReleaseStateCleanupCommitBuckets(process.cwd());

console.log(report.final_status);

if (report.final_status !== "GREEN_COMMIT_BUCKETS_READY") {
  process.exitCode = 1;
}
