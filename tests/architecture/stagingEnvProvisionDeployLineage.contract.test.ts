import {
  STOP_AI_ESTIMATE_STAGING_ENVIRONMENT_NOT_AVAILABLE_NO_GREEN,
  buildStagingEnvProvisionDeployLineageAndRcRerunSummary,
  detectStagingDeployAccess,
} from "../../scripts/estimate/auditAiEstimateStagingEnvProvisionDeployLineageAndRcRerun";
import { type StagingBaseUrlResolution } from "../../scripts/e2e/resolveStagingBaseUrl";

const resolution: StagingBaseUrlResolution = {
  baseUrl: "https://rik-expo-app-staging.onrender.com",
  source: "render.yaml",
  provider: "render",
  staging_url_detected: true,
  staging_config_detected: true,
  staging_provider_detected: true,
  staging_url_is_external: true,
  staging_url_is_not_localhost: true,
  blockers: [],
};

describe("staging env provision deploy lineage and RC rerun audit", () => {
  it("stops honestly when app staging is stale and deploy access is unavailable", () => {
    const summary = buildStagingEnvProvisionDeployLineageAndRcRerunSummary({
      sourceSha: "014158913980d27861b63923b9f0e74df2729cbe",
      branch: "release/ios-after-build48-integration",
      upstreamSync: "0 0",
      worktreeClean: true,
      pushed: true,
      resolution,
      deployAccess: {
        staging_deploy_access_detected: false,
        render_cli_available: false,
        deploy_access_env_keys_present: [],
        deploy_access_detection_methods: [],
      },
      versionArtifact: {
        final_status: "STOP_STAGING_VERSION_LINEAGE_FAILED_NO_GREEN",
        staging_source_sha_matches_head: false,
        staging_runtime_is_staging: false,
      },
      healthArtifact: {
        final_status: "STOP_AI_ESTIMATE_STAGING_HEALTH_FAILED_NO_GREEN",
        staging_request_status_ok: true,
        staging_source_sha_matches_head: false,
        staging_runtime_is_staging: false,
      },
      codeGuardrailsReady: true,
      stagingDeployStarted: false,
      stagingDeployCompleted: false,
    });

    expect(summary.final_status).toBe(STOP_AI_ESTIMATE_STAGING_ENVIRONMENT_NOT_AVAILABLE_NO_GREEN);
    expect(summary.code_guardrails_ready).toBe(true);
    expect(summary.staging_environment_missing).toBe(true);
    expect(summary.owner_action_required).toBe("PROVIDE_APP_STAGING_URL_OR_DEPLOY_ACCESS");
    expect(summary.fake_green_claimed).toBe(false);
    expect(summary.blocking_reasons).toEqual(expect.arrayContaining([
      "STAGING_SOURCE_SHA_NOT_PROVEN",
      "STAGING_RUNTIME_NOT_STAGING",
      "STAGING_DEPLOY_ACCESS_NOT_AVAILABLE",
      "STAGING_RC_RERUN_NOT_EXECUTED",
    ]));
  });

  it("reports deploy-access evidence by key name only", () => {
    const detection = detectStagingDeployAccess(
      {
        RENDER_API_TOKEN: "do-not-print-this",
        RENDER_STAGING_SERVICE_ID: "srv-do-not-print-this",
      },
      { renderCliAvailable: false },
    );

    expect(detection.staging_deploy_access_detected).toBe(true);
    expect(detection.deploy_access_env_keys_present).toEqual([
      "RENDER_API_TOKEN",
      "RENDER_STAGING_SERVICE_ID",
    ]);
    expect(JSON.stringify(detection)).not.toContain("do-not-print-this");
    expect(JSON.stringify(detection)).not.toContain("srv-do-not-print-this");
  });
});
