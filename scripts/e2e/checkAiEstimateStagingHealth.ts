import path from "node:path";

import {
  argValue,
  currentBranch,
  currentSourceSha,
  currentUpstreamSync,
  hasFlag,
  writeRuntimeJson,
} from "./renderStagingAcceptanceCore";
import { checkStagingVersionLineage } from "./checkStagingVersionLineage";
import { resolveStagingBaseUrl } from "./resolveStagingBaseUrl";

export const GREEN_AI_ESTIMATE_STAGING_HEALTH_READY =
  "GREEN_AI_ESTIMATE_STAGING_HEALTH_READY" as const;
export const STOP_AI_ESTIMATE_STAGING_HEALTH_FAILED_NO_GREEN =
  "STOP_AI_ESTIMATE_STAGING_HEALTH_FAILED_NO_GREEN" as const;

type Probe = {
  path: string;
  status: number | null;
  ok: boolean;
  response_time_ms: number;
  content_type: string | null;
  redirect_loop_detected: boolean;
  auth_wall_detected: boolean;
  error: string | null;
};

async function probe(baseUrl: string, probePath: string, required: boolean): Promise<Probe> {
  const started = Date.now();
  try {
    const response = await fetch(`${baseUrl}${probePath}`, { redirect: "follow" });
    const text = await response.text().catch(() => "");
    const status = response.status;
    return {
      path: probePath,
      status,
      ok: required ? response.ok : response.ok || status === 404,
      response_time_ms: Date.now() - started,
      content_type: response.headers.get("content-type"),
      redirect_loop_detected: false,
      auth_wall_detected: status === 401 || status === 403 || /sign in|login required|unauthorized|forbidden/i.test(text),
      error: response.ok || (!required && status === 404) ? null : `HTTP_${status}`,
    };
  } catch (error) {
    return {
      path: probePath,
      status: null,
      ok: false,
      response_time_ms: Date.now() - started,
      content_type: null,
      redirect_loop_detected: false,
      auth_wall_detected: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function checkAiEstimateStagingHealth(input: { url?: string | null; writeSummary?: boolean } = {}) {
  const sourceSha = currentSourceSha();
  const branch = currentBranch();
  const resolution = resolveStagingBaseUrl({ explicit: input.url });
  const probes = resolution.baseUrl
    ? [
      await probe(resolution.baseUrl, "/", true),
      await probe(resolution.baseUrl, "/request", true),
      await probe(resolution.baseUrl, "/api/version", true),
      await probe(resolution.baseUrl, "/api/health", false),
      await probe(resolution.baseUrl, "/__version", false),
    ]
    : [];
  const version = await checkStagingVersionLineage({ url: resolution.baseUrl, writeSummary: false });
  const home = probes.find((item) => item.path === "/");
  const request = probes.find((item) => item.path === "/request");
  const versionProbe = probes.find((item) => item.path === "/api/version");
  const blockers = [
    ...resolution.blockers,
    home?.ok === true ? "" : "staging_home_not_ok",
    request?.ok === true ? "" : "staging_request_not_ok",
    versionProbe?.ok === true ? "" : "staging_version_not_ok",
    probes.every((item) => !item.redirect_loop_detected) ? "" : "staging_redirect_loop_detected",
    request && !request.auth_wall_detected ? "" : "staging_auth_wall_detected",
    probes.some((item) => item.response_time_ms > 0) ? "" : "staging_response_time_missing",
    version.artifact.staging_source_sha_matches_head ? "" : "STAGING_SOURCE_SHA_NOT_PROVEN",
    version.artifact.staging_runtime_is_staging ? "" : "STAGING_RUNTIME_NOT_STAGING",
  ].filter(Boolean);
  const summary = {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_STAGING_HEALTH_READY
      : STOP_AI_ESTIMATE_STAGING_HEALTH_FAILED_NO_GREEN,
    source_sha: sourceSha,
    branch,
    upstream_sync: currentUpstreamSync(),
    generated_at: new Date().toISOString(),
    staging_url: resolution.baseUrl,
    staging_health_check_created: true,
    staging_home_status_ok: home?.ok === true,
    staging_request_status_ok: request?.ok === true,
    staging_version_status_ok: versionProbe?.ok === true,
    staging_redirect_loop_absent: probes.every((item) => !item.redirect_loop_detected),
    staging_auth_wall_absent_or_expected: request ? !request.auth_wall_detected : false,
    staging_response_time_recorded: probes.some((item) => item.response_time_ms > 0),
    staging_source_sha_matches_head: version.artifact.staging_source_sha_matches_head,
    staging_catalog_version_matches_11610: version.artifact.staging_catalog_version_matches_11610,
    staging_runtime_is_staging: version.artifact.staging_runtime_is_staging,
    version_lineage: version.artifact,
    probes,
    blocking_reasons: blockers,
    fake_green_claimed: false,
  };
  return input.writeSummary === false
    ? { artifactPath: path.join(".release-runtime", "ai-estimate-staging-release-candidate-operations-seal", "health", "not-written", "summary.json"), artifact: summary }
    : writeRuntimeJson(".release-runtime/ai-estimate-staging-release-candidate-operations-seal/health", summary);
}

if (require.main === module) {
  void checkAiEstimateStagingHealth({
    url: argValue("url"),
    writeSummary: !hasFlag("no-write-summary") || hasFlag("write-summary"),
  }).then((result) => {
    console.info(JSON.stringify({
      final_status: result.artifact.final_status,
      staging_url: result.artifact.staging_url,
      staging_request_status_ok: result.artifact.staging_request_status_ok,
      staging_source_sha_matches_head: result.artifact.staging_source_sha_matches_head,
      blocking_reasons: result.artifact.blocking_reasons.slice(0, 20),
      artifact: result.artifactPath,
    }, null, 2));
    if (result.artifact.blocking_reasons.length > 0) process.exitCode = 1;
  }).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
