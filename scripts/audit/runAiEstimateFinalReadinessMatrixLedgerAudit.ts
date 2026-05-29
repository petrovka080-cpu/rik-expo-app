import { writeAiEstimateEnterpriseFinalReadinessArtifacts } from "./runAiEstimateEnterpriseFinalReadinessGoNoGo";

const report = writeAiEstimateEnterpriseFinalReadinessArtifacts();
if (report.matrix.matrix_ledger_passed !== true) {
  throw new Error(`FINAL_READINESS_MATRIX_LEDGER_FAILED:${report.matrix.blockers.join(";")}`);
}

