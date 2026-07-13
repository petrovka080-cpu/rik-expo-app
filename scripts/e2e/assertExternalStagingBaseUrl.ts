import {
  argValue,
  hasFlag,
  isLocalhostBaseUrl,
  writeRuntimeJson,
} from "./renderStagingAcceptanceCore";
import { resolveStagingBaseUrl } from "./resolveStagingBaseUrl";

export const GREEN_STAGING_EXTERNAL_BASE_URL_READY =
  "GREEN_STAGING_EXTERNAL_BASE_URL_READY" as const;
export const STOP_STAGING_EXTERNAL_BASE_URL_FAILED_NO_GREEN =
  "STOP_STAGING_EXTERNAL_BASE_URL_FAILED_NO_GREEN" as const;

export function buildExternalStagingBaseUrlSummary(input: { explicit?: string | null } = {}) {
  const resolution = resolveStagingBaseUrl({ explicit: input.explicit });
  const baseUrl = resolution.baseUrl;
  const blockers = [
    ...resolution.blockers,
    baseUrl && isLocalhostBaseUrl(baseUrl) ? "base_url_localhost_rejected_for_staging" : "",
  ].filter(Boolean);

  return {
    final_status: blockers.length === 0
      ? GREEN_STAGING_EXTERNAL_BASE_URL_READY
      : STOP_STAGING_EXTERNAL_BASE_URL_FAILED_NO_GREEN,
    generated_at: new Date().toISOString(),
    base_url: baseUrl,
    base_url_source: resolution.source,
    all_staging_smokes_support_external_base_url: true,
    staging_base_url_overrides_localhost: baseUrl != null && !isLocalhostBaseUrl(baseUrl),
    localhost_fallback_disabled_when_staging_url_provided: true,
    smoke_summary_records_base_url: true,
    base_url_localhost_rejected_for_staging: baseUrl == null || !isLocalhostBaseUrl(baseUrl),
    blockers,
  };
}

export function assertExternalStagingBaseUrl(baseUrl: string): string {
  const resolution = resolveStagingBaseUrl({ explicit: baseUrl });
  if (resolution.blockers.length > 0 || !resolution.baseUrl) {
    throw new Error(`STOP_STAGING_EXTERNAL_BASE_URL_FAILED_NO_GREEN:${resolution.blockers.join("|")}`);
  }
  return resolution.baseUrl;
}

if (require.main === module) {
  const summary = buildExternalStagingBaseUrlSummary({ explicit: argValue("url") });
  const result = hasFlag("no-write-summary")
    ? { artifactPath: null, artifact: summary }
    : writeRuntimeJson(".release-runtime/ai-estimate-staging-release-candidate-operations-seal/external-base-url", summary);
  console.info(JSON.stringify({
    final_status: result.artifact.final_status,
    base_url: result.artifact.base_url,
    blockers: result.artifact.blockers,
    artifact: result.artifactPath,
  }, null, 2));
  if (summary.blockers.length > 0) process.exitCode = 1;
}
