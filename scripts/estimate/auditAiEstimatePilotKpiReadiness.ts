import path from "node:path";

import {
  currentBranch,
  currentSourceSha,
  currentUpstreamSync,
  writeRuntimeJson,
} from "../e2e/renderStagingAcceptanceCore";
import { validateAiEstimatePilotKpiReadiness } from "../../src/lib/platform/aiEstimatePilotKpiContract";

const ROOT = path.join(".release-runtime", "ai-estimate-owner-review-pilot-operating-system", "pilot-kpi");

export const GREEN_AI_ESTIMATE_PILOT_KPI_READINESS = "GREEN_AI_ESTIMATE_PILOT_KPI_READINESS" as const;
export const STOP_AI_ESTIMATE_PILOT_KPI_READINESS = "STOP_AI_ESTIMATE_PILOT_KPI_READINESS_FAILED" as const;

export function auditAiEstimatePilotKpiReadiness() {
  const validation = validateAiEstimatePilotKpiReadiness();
  const summary = {
    final_status: validation.passed ? GREEN_AI_ESTIMATE_PILOT_KPI_READINESS : STOP_AI_ESTIMATE_PILOT_KPI_READINESS,
    source_sha: currentSourceSha(),
    branch: currentBranch(),
    upstream_sync: currentUpstreamSync(),
    generated_at: new Date().toISOString(),
    ...validation,
    owner_approved: false,
    production_release_started: false,
    contract_total_claimed: false,
    fake_green_claimed: false,
    blocking_reasons: validation.failures,
  };
  const result = writeRuntimeJson(ROOT, summary);
  return { artifactPath: result.artifactPath, artifact: summary };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/auditAiEstimatePilotKpiReadiness.ts")) {
  const result = auditAiEstimatePilotKpiReadiness();
  console.log(JSON.stringify({
    artifact: result.artifactPath,
    final_status: result.artifact.final_status,
    blocking_reasons: result.artifact.blocking_reasons,
  }, null, 2));
  if (result.artifact.final_status !== GREEN_AI_ESTIMATE_PILOT_KPI_READINESS) process.exitCode = 1;
}
