import { writeAiEstimateEnterpriseFinalReadinessArtifacts } from "./runAiEstimateEnterpriseFinalReadinessGoNoGo";

const report = writeAiEstimateEnterpriseFinalReadinessArtifacts();
if (report.matrix.production_rollout_enabled === true || report.matrix.public_rollout_enabled === true) {
  throw new Error("PRODUCTION_ROLLOUT_ENABLED");
}
if (report.matrix.internal_canary_ready !== true) throw new Error("CANARY_NOT_SAFE");

