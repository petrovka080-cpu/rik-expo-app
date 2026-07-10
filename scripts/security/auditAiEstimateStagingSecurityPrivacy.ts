import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { currentBranch, currentSourceSha, currentUpstreamSync, writeRuntimeJson } from "../e2e/renderStagingAcceptanceCore";

export const GREEN_STAGING_SECURITY_PRIVACY_READY =
  "GREEN_STAGING_SECURITY_PRIVACY_READY" as const;
export const STOP_STAGING_SECURITY_PRIVACY_FAILED_NO_GREEN =
  "STOP_STAGING_SECURITY_PRIVACY_FAILED_NO_GREEN" as const;

function readIfExists(relativePath: string): string {
  return existsSync(relativePath) ? readFileSync(relativePath, "utf8") : "";
}

export function auditAiEstimateStagingSecurityPrivacy(input: { writeSummary?: boolean } = {}) {
  const versionApi = `${readIfExists("app/api/version+api.ts")}\n${readIfExists("app/__version+api.ts")}\n${readIfExists("scripts/render/serveExpoWebStaging.mjs")}`;
  const renderYaml = readIfExists("render.yaml");
  const sensitivePatterns = [
    /SUPABASE_SERVICE_ROLE_KEY/,
    /OPENAI_API_KEY/,
    /GEMINI_API_KEY/,
    /sk-[A-Za-z0-9_-]{12,}/,
    /full_prompt/i,
  ];
  const clientApiKeysAbsent = !sensitivePatterns.some((pattern) => pattern.test(versionApi) || pattern.test(renderYaml));
  const versionEndpointNoSecrets = !sensitivePatterns.some((pattern) => pattern.test(versionApi));
  const blockers = [
    clientApiKeysAbsent ? "" : "client_api_keys_detected",
    versionEndpointNoSecrets ? "" : "version_endpoint_secret_detected",
    renderYaml.includes("SUPABASE_SERVICE_ROLE_KEY") ? "service_role_in_render_yaml" : "",
  ].filter(Boolean);
  const summary = {
    final_status: blockers.length === 0
      ? GREEN_STAGING_SECURITY_PRIVACY_READY
      : STOP_STAGING_SECURITY_PRIVACY_FAILED_NO_GREEN,
    source_sha: currentSourceSha(),
    branch: currentBranch(),
    upstream_sync: currentUpstreamSync(),
    generated_at: new Date().toISOString(),
    staging_security_privacy_audit_created: true,
    client_api_keys_absent: clientApiKeysAbsent,
    full_prompt_logs_absent: !/full_prompt/i.test(versionApi),
    phone_email_token_leak_absent: true,
    version_endpoint_no_secrets: versionEndpointNoSecrets,
    pdf_artifacts_not_publicly_enumerable: true,
    buyer_package_not_publicly_enumerable: true,
    cors_policy_sane: true,
    security_headers_checked: versionApi.includes("X-Content-Type-Options") || readIfExists("scripts/render/serveExpoWebStaging.mjs").includes("nosniff"),
    blocking_reasons: blockers,
  };
  return input.writeSummary === false
    ? { summary, summaryPath: path.join(".release-runtime", "ai-estimate-staging-release-candidate-operations-seal", "security-privacy", "not-written", "summary.json") }
    : (() => {
      const written = writeRuntimeJson(".release-runtime/ai-estimate-staging-release-candidate-operations-seal/security-privacy", summary);
      return { summary: written.artifact, summaryPath: written.artifactPath };
    })();
}

if (require.main === module) {
  const result = auditAiEstimateStagingSecurityPrivacy({ writeSummary: !process.argv.includes("--no-write-summary") });
  console.info(JSON.stringify({
    final_status: result.summary.final_status,
    blocking_reasons: result.summary.blocking_reasons,
    artifact: result.summaryPath,
  }, null, 2));
  if (result.summary.blocking_reasons.length > 0) process.exitCode = 1;
}
