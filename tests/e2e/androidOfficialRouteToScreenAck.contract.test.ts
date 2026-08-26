import fs from "node:fs";
import path from "node:path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

function read(relativePath: string): string {
  return fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");
}

describe("official Android route-to-screen ACK ownership", () => {
  const owner = read("scripts/release/android/routeToScreenAck.ts");
  const normalApkSmoke = read("scripts/release/android/runAppRootSmoke.ts");
  const liveApi34Smoke = read(
    "scripts/e2e/runAndroidApi34LiveRequestEmbeddedAiProfessionalBoqPdfCatalogSmoke.ts",
  );
  const pipelineVerifier = read("scripts/release/android/verifyProof.ts");
  const workGroupSurface = read(
    "scripts/estimate/r4/runR4WorkGroupAndroidSurface.ts",
  );

  it("keeps one canonical lifecycle and four-case matrix", () => {
    for (const stage of [
      "INTENT_RECEIVED",
      "URL_PARSED",
      "AUTH_RESOLVED",
      "INTENT_APPLIED",
      "DRAFT_SESSION_READY",
      "UI_READY",
      "INTENT_ACKNOWLEDGED",
    ]) {
      expect(owner).toContain(`"${stage}"`);
    }
    expect(owner.match(/caseId: "android_/g)).toHaveLength(4);
    expect(owner).toContain("exactOrder");
    expect(owner).toContain("exactlyOnce");
    expect(owner).toContain("expectedWithColdAuthPending");
    expect(owner).toContain("authPendingObserved");
    expect(owner).toContain("isWarmAndroidActivityDelivery");
  });

  it("makes both official Android smokes consume the canonical owner", () => {
    for (const consumer of [normalApkSmoke, liveApi34Smoke]) {
      expect(consumer).toContain("OFFICIAL_ROUTE_TO_SCREEN_ACK_CASES");
      expect(consumer).toContain("collectRouteToScreenLifecycleEvidence");
      expect(consumer).toContain("isWarmAndroidActivityDelivery");
      expect(consumer).toContain("isolated_probe_substitution_allowed: false");
      expect(consumer).not.toContain(
        "runAndroidWarmDeepLinkRouteToScreenAckProbe",
      );
    }
    expect(normalApkSmoke).toContain('from "./routeToScreenAck"');
    expect(liveApi34Smoke).toContain(
      'from "../release/android/routeToScreenAck"',
    );
  });

  it("opens the canonical login route before the protected four-case matrix", () => {
    expect(normalApkSmoke).toContain('"rik:///auth/login"');
    expect(normalApkSmoke).not.toContain(
      'prompt: "проверка входа normal APK route ACK"',
    );
  });

  it("uses production-visible redacted lifecycle evidence and canonical surface predicates", () => {
    const observability = read(
      "src/lib/navigation/requestEstimateLaunchObservability.ts",
    );
    const logger = read("src/lib/logger.ts");

    expect(observability).toContain("logger.releaseEvidence(");
    expect(logger).toContain("releaseEvidence(");
    expect(logger).toContain("redactSensitiveValue(detail)");
    expect(normalApkSmoke).toContain("isAndroidRequestRouteSurfaceXml");
    expect(normalApkSmoke).toContain("isAndroidEmbeddedAiRouteSurfaceXml");
    expect(normalApkSmoke).toContain("promptUiSample");
    expect(normalApkSmoke).toContain("estimateUiSample");
  });

  it("fails the normal-APK verifier unless ACK, auth and cleanup are green", () => {
    expect(pipelineVerifier).toContain(
      "GREEN_ANDROID_NORMAL_APK_ROUTE_TO_SCREEN_ACK",
    );
    expect(pipelineVerifier).toContain(
      "ROUTE_TO_SCREEN_ACK_PASSED_CASES_MISMATCH",
    );
    expect(pipelineVerifier).toContain(
      "ISOLATED_PROBE_SUBSTITUTION_NOT_FORBIDDEN",
    );
    expect(pipelineVerifier).toContain("AUTH_NOT_GREEN");
    expect(pipelineVerifier).toContain("TEMPORARY_USER_CLEANUP_NOT_GREEN");
  });

  it("checks the exact cold revision at the top before a bounded visible row-count traversal", () => {
    expect(workGroupSurface).toContain("waitForNativeRevisionUi");
    expect(workGroupSurface).toContain("findVisibleNativeRevisionRowCount");
    expect(workGroupSurface).toContain("boundsIntersectDisplay");
    expect(workGroupSurface).toContain("Physical size:");
    expect(workGroupSurface).toContain("scrollCount <= 18");
    expect(workGroupSurface).toContain("revision_marker");
    expect(workGroupSurface).toContain("R4_ANDROID_NATIVE_REVISION_ROW_COUNT_TRAVERSAL_RED");
    expect(workGroupSurface).toContain('let lastFailure = "UI_NOT_READY"');
    expect(workGroupSurface).toContain("R4_ANDROID_AUTH_UI_TIMEOUT:${label}:${lastFailure}");
    expect(workGroupSurface).not.toContain("R4_ANDROID_NATIVE_REVISION_UI_TIMEOUT");
  });
});
