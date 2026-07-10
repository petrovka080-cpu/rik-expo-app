import { readFileSync } from "node:fs";

import {
  GREEN_RENDER_STAGING_DEPLOY_LINEAGE_READY,
  REQUIRED_STAGING_CATALOG_VERSION,
  STOP_RENDER_DEPLOY_CREDENTIALS_MISSING_NO_GREEN,
  buildDeployHookTriggerUrl,
  buildRenderStagingDeployLineageSummary,
  detectRenderDeployCredentials,
  selectRenderDeployMode,
} from "../../scripts/ops/deployRenderStagingAndWaitForLineage";

describe("render staging deploy automation", () => {
  it("detects deploy access by env key name only", () => {
    const detection = detectRenderDeployCredentials({
      RENDER_STAGING_DEPLOY_HOOK_URL: "https://api.render.com/deploy/srv-secret?key=do-not-log",
      RENDER_API_KEY: "do-not-log-api-key",
      RENDER_STAGING_SERVICE_ID: "srv-do-not-log",
    });

    expect(detection.render_deploy_credentials_detected).toBe(true);
    expect(detection.deploy_hook_mode_available).toBe(true);
    expect(detection.render_api_mode_available).toBe(true);
    expect(detection.deploy_access_env_keys_present).toEqual([
      "RENDER_STAGING_DEPLOY_HOOK_URL",
      "RENDER_API_KEY",
      "RENDER_STAGING_SERVICE_ID",
    ]);
    expect(JSON.stringify(detection)).not.toContain("do-not-log");
    expect(JSON.stringify(detection)).not.toContain("srv-do-not-log");
  });

  it("supports hook ref and API clear-cache mode without committing secrets", () => {
    const source = readFileSync("scripts/ops/deployRenderStagingAndWaitForLineage.ts", "utf8");

    expect(source).toContain("RENDER_STAGING_DEPLOY_HOOK_URL");
    expect(source).toContain("RENDER_API_KEY");
    expect(source).toContain("RENDER_STAGING_SERVICE_ID");
    expect(source).toContain("commitId");
    expect(source).toContain("clearCache");
    expect(source).toContain("clear");
    expect(source).toContain("STOP_RENDER_DEPLOY_CREDENTIALS_MISSING_NO_GREEN");
    expect(source).toContain("deploy_secret_not_logged");
    expect(source).toContain("/api/version");
    expect(source).toContain("catalog:11610");
    expect(source).not.toContain("TySjyUQsz88");

    const triggerUrl = buildDeployHookTriggerUrl("https://api.render.com/deploy/srv-x?key=secret", "abc123");
    expect(triggerUrl).toContain("ref=abc123");

    expect(selectRenderDeployMode(detectRenderDeployCredentials({
      RENDER_STAGING_DEPLOY_HOOK_URL: "https://api.render.com/deploy/srv-x?key=secret",
    }))).toBe("deploy_hook");
    expect(selectRenderDeployMode(detectRenderDeployCredentials({
      RENDER_API_KEY: "secret",
      RENDER_STAGING_SERVICE_ID: "srv-x",
    }), { clearCache: true })).toBe("render_api");
  });

  it("stops honestly when deploy credentials are missing", () => {
    const summary = buildRenderStagingDeployLineageSummary({
      baseUrl: "https://rik-expo-app-staging.onrender.com",
      commit: "30150686a9ccaddc46a5400d5eec49f0084a6b0d",
      branch: "release/ios-after-build48-integration",
      upstreamSync: "0 0",
      credentials: detectRenderDeployCredentials({}),
      deployMode: null,
      clearCacheRequested: true,
      trigger: {
        deploy_started: false,
        deploy_request_http_status: null,
        deploy_request_error: "RENDER_DEPLOY_CREDENTIALS_MISSING",
      },
      wait: {
        deploy_completed: false,
        last_version_payload: null,
        last_version_http_status: null,
        last_version_error: "DEPLOY_NOT_STARTED",
        lineage_poll_attempts: 0,
        elapsed_ms: 0,
      },
      timeoutMs: 1_000,
      pollMs: 100,
    });

    expect(summary.final_status).toBe(STOP_RENDER_DEPLOY_CREDENTIALS_MISSING_NO_GREEN);
    expect(summary.fake_green_claimed).toBe(false);
    expect(summary.deploy_secret_not_logged).toBe(true);
    expect(summary.blocking_reasons).toContain("STOP_RENDER_DEPLOY_CREDENTIALS_MISSING_NO_GREEN");
  });

  it("can be green only after staging lineage matches the deployed HEAD", () => {
    const commit = "30150686a9ccaddc46a5400d5eec49f0084a6b0d";
    const summary = buildRenderStagingDeployLineageSummary({
      baseUrl: "https://rik-expo-app-staging.onrender.com",
      commit,
      branch: "release/ios-after-build48-integration",
      upstreamSync: "0 0",
      credentials: detectRenderDeployCredentials({
        RENDER_STAGING_DEPLOY_HOOK_URL: "https://api.render.com/deploy/srv-x?key=secret",
      }),
      deployMode: "deploy_hook",
      clearCacheRequested: false,
      trigger: {
        deploy_started: true,
        deploy_request_http_status: 200,
        deploy_request_error: null,
      },
      wait: {
        deploy_completed: true,
        last_version_payload: {
          source_sha: commit,
          branch: "release/ios-after-build48-integration",
          runtime: "staging",
          catalog_version: REQUIRED_STAGING_CATALOG_VERSION,
        },
        last_version_http_status: 200,
        last_version_error: null,
        lineage_poll_attempts: 2,
        elapsed_ms: 10_000,
      },
      timeoutMs: 60_000,
      pollMs: 1_000,
    });

    expect(summary.final_status).toBe(GREEN_RENDER_STAGING_DEPLOY_LINEAGE_READY);
    expect(summary.render_deploy_automation_created).toBe(true);
    expect(summary.deploy_hook_mode_supported).toBe(true);
    expect(summary.render_api_mode_supported).toBe(true);
    expect(summary.deploy_started).toBe(true);
    expect(summary.deploy_completed).toBe(true);
    expect(summary.staging_source_sha_matches_head).toBe(true);
    expect(summary.staging_runtime_is_staging).toBe(true);
    expect(summary.staging_catalog_version_matches_11610).toBe(true);
    expect(summary.deploy_timeout_bounded).toBe(true);
    expect(summary.fake_green_claimed).toBe(false);
    expect(summary.blocking_reasons).toEqual([]);
  });
});
