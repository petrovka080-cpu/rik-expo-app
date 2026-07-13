import path from "node:path";

import { validateEstimateLineage } from "../../src/lib/estimate/validateEstimateLineage";
import {
  currentBranch,
  currentSourceSha,
  currentUpstreamSync,
  writeRuntimeJson,
} from "../e2e/renderStagingAcceptanceCore";

const ROOT = path.join(".release-runtime", "ai-estimate-platform-core-scale-seal", "estimate-lineage");

export function auditEstimateLineageSeal() {
  const validation = validateEstimateLineage();
  const summary = {
    final_status: validation.passed
      ? "GREEN_AI_ESTIMATE_LINEAGE_SEAL"
      : "STOP_AI_ESTIMATE_LINEAGE_SEAL_FAILED",
    source_sha: currentSourceSha(),
    branch: currentBranch(),
    upstream_sync: currentUpstreamSync(),
    generated_at: new Date().toISOString(),
    ...validation,
    fake_green_claimed: false,
  };
  return writeRuntimeJson(ROOT, summary);
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/auditEstimateLineageSeal.ts")) {
  const result = auditEstimateLineageSeal();
  console.log(JSON.stringify({
    artifact: result.artifactPath,
    final_status: result.artifact.final_status,
    failures: result.artifact.failures,
  }, null, 2));
  if (!result.artifact.passed) process.exitCode = 1;
}
