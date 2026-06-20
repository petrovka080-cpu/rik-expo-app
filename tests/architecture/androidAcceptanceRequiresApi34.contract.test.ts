import { readRepoFile } from "./anyEstimateArchitectureTestHelpers";

describe("Android acceptance requires API 34", () => {
  it("uses API34-only preflight and frozen APK evidence in release verify", () => {
    const preflight = readRepoFile("scripts/release/android/preflight.ts");
    const smoke = readRepoFile("scripts/release/android/runAppRootSmoke.ts");
    const verifier = readRepoFile("scripts/release/android/verifyProof.ts");
    const releaseGuard = readRepoFile("scripts/release/releaseGuard.shared.ts");

    expect(preflight).toContain("GREEN_ANDROID_API34_PIPELINE_PREFLIGHT_READY");
    expect(preflight).toContain("android_actual_api");
    expect(preflight).toContain("api36_used");
    expect(smoke).toContain("GREEN_ANDROID_API34_PIPELINE_SMOKE_READY");
    expect(smoke).toContain("android_build_identity_matches");
    expect(smoke).toContain("android_uses_metro: false");
    expect(smoke).toContain("business_route_opened: false");
    expect(smoke).toContain("auth_login_attempted: false");
    expect(verifier).toContain("preflight.android_actual_api !== 34");
    expect(verifier).toContain("preflight.api36_used === true");
    expect(verifier).toContain("GREEN_ANDROID_API34_PIPELINE_READY");
    expect(releaseGuard).toContain("android-api34-frozen-apk-pipeline-proof");
    expect(releaseGuard).toContain("scripts/release/android/verifyProof.ts");
    expect(releaseGuard).not.toContain("android-api34-canonical-replay-b2c-expanded-estimate-binding-proof");
    expect(releaseGuard).not.toContain("scripts/e2e/runAndroidApi34CanonicalReplayB2cExpandedEstimateBinding.ts");
  });

  it("runs frozen API34 verification before legacy Android route evidence consumers", () => {
    const releaseGuard = readRepoFile("scripts/release/releaseGuard.shared.ts");
    const api34Index = releaseGuard.indexOf('{ name: "android-api34-frozen-apk-pipeline-proof"');
    const routeBootstrapIndex = releaseGuard.indexOf('{ name: "android-b2c-request-embedded-ai-route-bootstrap-proof"');
    const appRootIndex = releaseGuard.indexOf('{ name: "android-app-root-ready-marker-b2c-request-embedded-ai-proof"');
    const adbReplayIndex = releaseGuard.indexOf('{ name: "android-emulator-adb-unblock-replay-b2c-expanded-estimate-fix-proof"');

    expect(api34Index).toBeGreaterThan(-1);
    expect(routeBootstrapIndex).toBeGreaterThan(-1);
    expect(appRootIndex).toBeGreaterThan(-1);
    expect(adbReplayIndex).toBeGreaterThan(-1);
    expect(api34Index).toBeLessThan(routeBootstrapIndex);
    expect(api34Index).toBeLessThan(appRootIndex);
    expect(api34Index).toBeLessThan(adbReplayIndex);
  });

  it("does not allow GREEN unless API34 device and frozen app-root facts are proven", () => {
    const verifier = readRepoFile("scripts/release/android/verifyProof.ts");

    expect(verifier).toContain('failures.push("ANDROID_ACTUAL_API_NOT_34")');
    expect(verifier).toContain('failures.push("API36_USED")');
    expect(verifier).toContain('failures.push("EMBEDDED_BUNDLE_NOT_PROVEN")');
    expect(verifier).toContain('failures.push("BUILD_CACHE_NOT_VALID")');
    expect(verifier).toContain('failures.push("APP_ROOT_NOT_READY")');
    expect(verifier).toContain('failures.push("BUILD_IDENTITY_MISMATCH")');
    expect(verifier).toContain('failures.push("CANDIDATE_HASH_MISMATCH")');
  });
});
