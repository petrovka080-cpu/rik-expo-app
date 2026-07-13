import path from "node:path";

import {
  argValue,
  currentBranch,
  currentSourceSha,
  currentUpstreamSync,
  hasFlag,
  writeRuntimeJson,
} from "./renderStagingAcceptanceCore";
import { resolveStagingBaseUrl } from "./resolveStagingBaseUrl";

export const GREEN_STAGING_VERSION_LINEAGE_READY =
  "GREEN_STAGING_VERSION_LINEAGE_READY" as const;
export const STOP_STAGING_VERSION_LINEAGE_FAILED_NO_GREEN =
  "STOP_STAGING_VERSION_LINEAGE_FAILED_NO_GREEN" as const;

export type StagingVersionLineageSummary = ReturnType<typeof buildStagingVersionLineageSummary>;

type VersionPayload = Record<string, unknown>;

function text(value: unknown): string {
  return String(value ?? "").trim();
}

async function readVersion(baseUrl: string): Promise<{ path: string | null; payload: VersionPayload | null; error: string | null }> {
  for (const endpoint of ["/api/version", "/__version"]) {
    try {
      const response = await fetch(`${baseUrl}${endpoint}`);
      if (!response.ok) continue;
      const payload = await response.json().catch(() => null);
      if (payload && typeof payload === "object" && !Array.isArray(payload)) {
        return { path: endpoint, payload: payload as VersionPayload, error: null };
      }
    } catch (error) {
      return { path: endpoint, payload: null, error: error instanceof Error ? error.message : String(error) };
    }
  }
  return { path: null, payload: null, error: "version_endpoint_missing" };
}

export function buildStagingVersionLineageSummary(input: {
  baseUrl: string | null;
  payload: VersionPayload | null;
  versionPath?: string | null;
  fetchError?: string | null;
}) {
  const sourceSha = currentSourceSha();
  const branch = currentBranch();
  const payload = input.payload;
  const payloadSourceSha = text(payload?.source_sha);
  const payloadBranch = text(payload?.branch);
  const payloadRuntime = text(payload?.runtime);
  const catalogVersion = text(payload?.catalog_version);
  const aiKernelVersion = text(payload?.ai_kernel_version);
  const evalopsManifestVersion = text(payload?.evalops_manifest_version);
  const blockers = [
    input.baseUrl ? "" : "STAGING_URL_NOT_CONFIGURED",
    payload ? "" : "STAGING_VERSION_ENDPOINT_MISSING",
    input.fetchError ? `STAGING_VERSION_FETCH_FAILED:${input.fetchError}` : "",
    payloadSourceSha ? "" : "STAGING_SOURCE_SHA_MISSING",
    payloadSourceSha === sourceSha ? "" : "STAGING_SOURCE_SHA_NOT_PROVEN",
    payloadBranch === branch ? "" : "STAGING_BRANCH_MISMATCH",
    payloadRuntime === "staging" ? "" : "STAGING_RUNTIME_NOT_STAGING",
    catalogVersion === "catalog:11610" ? "" : "STAGING_CATALOG_VERSION_MISMATCH",
    aiKernelVersion ? "" : "STAGING_AI_KERNEL_VERSION_MISSING",
    evalopsManifestVersion ? "" : "STAGING_EVALOPS_MANIFEST_VERSION_MISSING",
  ].filter(Boolean);

  return {
    final_status: blockers.length === 0
      ? GREEN_STAGING_VERSION_LINEAGE_READY
      : STOP_STAGING_VERSION_LINEAGE_FAILED_NO_GREEN,
    source_sha: sourceSha,
    branch,
    upstream_sync: currentUpstreamSync(),
    generated_at: new Date().toISOString(),
    staging_url: input.baseUrl,
    version_endpoint_path: input.versionPath ?? null,
    version_payload: payload,
    staging_version_endpoint_created: true,
    staging_source_sha_detected: payloadSourceSha.length > 0,
    staging_source_sha_matches_head: payloadSourceSha === sourceSha,
    staging_branch_matches: payloadBranch === branch,
    staging_runtime_is_staging: payloadRuntime === "staging",
    staging_catalog_version_matches_11610: catalogVersion === "catalog:11610",
    staging_ai_kernel_version_present: aiKernelVersion.length > 0,
    staging_evalops_manifest_version_present: evalopsManifestVersion.length > 0,
    fake_green_claimed: false,
    blocking_reasons: blockers,
  };
}

export async function checkStagingVersionLineage(input: { url?: string | null; writeSummary?: boolean } = {}) {
  const resolution = resolveStagingBaseUrl({ explicit: input.url });
  const version = resolution.baseUrl
    ? await readVersion(resolution.baseUrl)
    : { path: null, payload: null, error: "staging_url_missing" };
  const summary = buildStagingVersionLineageSummary({
    baseUrl: resolution.baseUrl,
    payload: version.payload,
    versionPath: version.path,
    fetchError: version.error,
  });
  const artifact = input.writeSummary === false
    ? { artifactPath: path.join(".release-runtime", "ai-estimate-staging-release-candidate-operations-seal", "version-lineage", "not-written", "summary.json"), artifact: summary }
    : writeRuntimeJson(".release-runtime/ai-estimate-staging-release-candidate-operations-seal/version-lineage", summary);
  return artifact;
}

if (require.main === module) {
  void checkStagingVersionLineage({
    url: argValue("url"),
    writeSummary: !hasFlag("no-write-summary") || hasFlag("write-summary"),
  }).then((result) => {
    console.info(JSON.stringify({
      final_status: result.artifact.final_status,
      staging_source_sha_matches_head: result.artifact.staging_source_sha_matches_head,
      staging_runtime_is_staging: result.artifact.staging_runtime_is_staging,
      blocking_reasons: result.artifact.blocking_reasons.slice(0, 20),
      artifact: result.artifactPath,
    }, null, 2));
    if (result.artifact.blocking_reasons.length > 0) process.exitCode = 1;
  }).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
