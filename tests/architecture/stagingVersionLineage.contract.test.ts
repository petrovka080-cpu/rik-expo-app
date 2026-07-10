import { buildStagingVersionPayload } from "../../src/lib/platform/stagingVersionPayload";
import {
  GREEN_STAGING_VERSION_LINEAGE_READY,
  STOP_STAGING_VERSION_LINEAGE_FAILED_NO_GREEN,
  buildStagingVersionLineageSummary,
} from "../../scripts/e2e/checkStagingVersionLineage";
import { currentBranch, currentSourceSha } from "../../scripts/e2e/renderStagingAcceptanceCore";

describe("staging version lineage", () => {
  it("builds the required staging version payload", () => {
    const payload = buildStagingVersionPayload({
      RENDER: "true",
      RENDER_APP_SERVICE_NAME: "rik-expo-app-staging",
      RENDER_GIT_COMMIT: currentSourceSha(),
      RENDER_GIT_BRANCH: currentBranch(),
      RENDER_BUILD_TIME: "2026-07-10T00:00:00.000Z",
    });

    expect(payload).toMatchObject({
      source_sha: currentSourceSha(),
      branch: currentBranch(),
      runtime: "staging",
      catalog_version: "catalog:11610",
      ai_kernel_version: "ai-platform-runtime-kernel-v1",
      evalops_manifest_version: "ai-platform-evalops-prompt-v1",
      provider: "render",
    });
  });

  it("fails closed when staging source sha is stale", () => {
    const summary = buildStagingVersionLineageSummary({
      baseUrl: "https://rik-expo-app-staging.onrender.com",
      payload: {
        source_sha: "stale",
        branch: currentBranch(),
        runtime: "staging",
        catalog_version: "catalog:11610",
        ai_kernel_version: "ai-platform-runtime-kernel-v1",
        evalops_manifest_version: "ai-platform-evalops-prompt-v1",
      },
      versionPath: "/api/version",
    });

    expect(summary.final_status).toBe(STOP_STAGING_VERSION_LINEAGE_FAILED_NO_GREEN);
    expect(summary.fake_green_claimed).toBe(false);
    expect(summary.blocking_reasons).toContain("STAGING_SOURCE_SHA_NOT_PROVEN");
  });

  it("can be green only with current HEAD and staging runtime", () => {
    const summary = buildStagingVersionLineageSummary({
      baseUrl: "https://rik-expo-app-staging.onrender.com",
      payload: {
        source_sha: currentSourceSha(),
        branch: currentBranch(),
        runtime: "staging",
        catalog_version: "catalog:11610",
        ai_kernel_version: "ai-platform-runtime-kernel-v1",
        evalops_manifest_version: "ai-platform-evalops-prompt-v1",
      },
      versionPath: "/api/version",
    });

    expect(summary.final_status).toBe(GREEN_STAGING_VERSION_LINEAGE_READY);
  });
});
