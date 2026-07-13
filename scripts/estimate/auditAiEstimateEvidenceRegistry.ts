import path from "node:path";

import {
  isEvidenceSummaryAcceptedForCurrentHead,
  validateAiEstimateEvidenceRegistry,
  type EvidenceSummaryLike,
} from "../../src/lib/platform/evidenceRegistry";
import {
  currentBranch,
  currentSourceSha,
  currentUpstreamSync,
  newestSummary,
  writeRuntimeJson,
} from "../e2e/renderStagingAcceptanceCore";

const ROOT = path.join(".release-runtime", "ai-estimate-platform-core-scale-seal", "evidence-registry");
const PLATFORM_ROOT = path.join(".release-runtime", "ai-estimate-platform-core-scale-seal");
const WEB_ROOT = path.join(PLATFORM_ROOT, "web");
const ANDROID_ROOT = path.join(PLATFORM_ROOT, "android-chrome");
const PARITY_ROOT = path.join(PLATFORM_ROOT, "web-android-parity");

function latestGreen(root: string): { path: string; summary: EvidenceSummaryLike } | null {
  return newestSummary<EvidenceSummaryLike>(root, (summary) => String(summary.final_status ?? "").startsWith("GREEN"));
}

export function auditAiEstimateEvidenceRegistry() {
  const head = currentSourceSha();
  const web = latestGreen(WEB_ROOT);
  const android = latestGreen(ANDROID_ROOT);
  const parity = latestGreen(PARITY_ROOT);
  const currentScopeSummaries = [web?.summary, android?.summary, parity?.summary]
    .filter((summary): summary is EvidenceSummaryLike => Boolean(summary));
  const validation = validateAiEstimateEvidenceRegistry({
    headSha: head,
    currentScopeSummaries,
    currentWebSummary: web?.summary ?? null,
    currentAndroidSummary: android?.summary ?? null,
    currentParitySummary: parity?.summary ?? null,
  });
  const acceptedCurrent = currentScopeSummaries.every((summary) => isEvidenceSummaryAcceptedForCurrentHead(summary, head));
  const summary = {
    final_status: validation.passed && acceptedCurrent
      ? "GREEN_AI_ESTIMATE_EVIDENCE_REGISTRY"
      : "STOP_AI_ESTIMATE_EVIDENCE_REGISTRY_FAILED",
    source_sha: head,
    branch: currentBranch(),
    upstream_sync: currentUpstreamSync(),
    generated_at: new Date().toISOString(),
    web_summary_path: web?.path ?? null,
    android_summary_path: android?.path ?? null,
    parity_summary_path: parity?.path ?? null,
    ...validation,
    fake_green_claimed: false,
  };
  return writeRuntimeJson(ROOT, summary);
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/auditAiEstimateEvidenceRegistry.ts")) {
  const result = auditAiEstimateEvidenceRegistry();
  console.log(JSON.stringify({
    artifact: result.artifactPath,
    final_status: result.artifact.final_status,
    failures: result.artifact.failures,
  }, null, 2));
  if (!result.artifact.passed) process.exitCode = 1;
}
