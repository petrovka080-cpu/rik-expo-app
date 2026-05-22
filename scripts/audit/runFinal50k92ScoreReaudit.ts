import {
  FINAL_50K_92_BLOCKED_STATUS,
  FINAL_50K_92_BLOCKED_PREFIX,
  FINAL_50K_92_GREEN_STATUS,
  writeFinal50k92ScoreReauditArtifacts,
} from "./final50k92ScoreReaudit.shared";

const report = writeFinal50k92ScoreReauditArtifacts();

console.log(JSON.stringify(report.matrix, null, 2));

if (
  report.matrix.final_status !== FINAL_50K_92_GREEN_STATUS
  && report.matrix.final_status !== FINAL_50K_92_BLOCKED_STATUS
  && !String(report.matrix.final_status).startsWith(FINAL_50K_92_BLOCKED_PREFIX)
) {
  process.exit(1);
}
