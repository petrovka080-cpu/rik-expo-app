import path from "node:path";

import {
  currentBranch,
  currentSourceSha,
  currentUpstreamSync,
  writeRuntimeJson,
} from "../e2e/renderStagingAcceptanceCore";
import { validateAiEstimatePilotOperatingModel } from "../../src/lib/platform/aiEstimatePilotOperatingModel";

const ROOT = path.join(".release-runtime", "ai-estimate-owner-review-pilot-operating-system", "pilot-operating-model");

export const GREEN_AI_ESTIMATE_PILOT_OPERATING_MODEL = "GREEN_AI_ESTIMATE_PILOT_OPERATING_MODEL" as const;
export const STOP_AI_ESTIMATE_PILOT_OPERATING_MODEL = "STOP_AI_ESTIMATE_PILOT_OPERATING_MODEL_FAILED" as const;

export function auditAiEstimatePilotOperatingModel() {
  const validation = validateAiEstimatePilotOperatingModel();
  const summary = {
    final_status: validation.passed ? GREEN_AI_ESTIMATE_PILOT_OPERATING_MODEL : STOP_AI_ESTIMATE_PILOT_OPERATING_MODEL,
    source_sha: currentSourceSha(),
    branch: currentBranch(),
    upstream_sync: currentUpstreamSync(),
    generated_at: new Date().toISOString(),
    ...validation,
    owner_approved: false,
    production_release_started: false,
    public_beta_started: false,
    fake_green_claimed: false,
    blocking_reasons: validation.failures,
  };
  const result = writeRuntimeJson(ROOT, summary);
  return { artifactPath: result.artifactPath, artifact: summary };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/auditAiEstimatePilotOperatingModel.ts")) {
  const result = auditAiEstimatePilotOperatingModel();
  console.log(JSON.stringify({
    artifact: result.artifactPath,
    final_status: result.artifact.final_status,
    blocking_reasons: result.artifact.blocking_reasons,
  }, null, 2));
  if (result.artifact.final_status !== GREEN_AI_ESTIMATE_PILOT_OPERATING_MODEL) process.exitCode = 1;
}
