import fs from "node:fs";
import path from "node:path";

const LEGACY_ANDROID_EVIDENCE_CONSUMERS = [
  "android-b2c-request-embedded-ai-route-bootstrap-proof",
  "android-app-root-ready-marker-b2c-request-embedded-ai-proof",
  "b2c-request-embedded-ai-entrypoint-audit-proof",
  "live-b2c-request-embedded-ai-estimate-reality-proof",
] as const;

function read(filePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), filePath), "utf8");
}

describe("release verify frozen API34 pipeline evidence", () => {
  it("verifies frozen APK evidence without starting Android replay in release verify", () => {
    const releaseGuard = read("scripts/release/releaseGuard.shared.ts");
    const releaseGates = releaseGuard.slice(releaseGuard.indexOf("export const REQUIRED_RELEASE_GATES"));

    expect(releaseGates).toContain('"android-api34-frozen-apk-pipeline-proof"');
    expect(releaseGates).toContain("scripts/release/android/verifyProof.ts");
    expect(releaseGates).not.toContain('"android-api34-canonical-replay-b2c-expanded-estimate-binding-proof"');
    expect(releaseGates).not.toContain('"b2c-request-embedded-ai-expanded-estimate-binding-proof"');
    expect(releaseGates).not.toContain("runAndroidApi34CanonicalReplayB2cExpandedEstimateBinding.ts --mode=verify");
  });

  it("keeps frozen API34 verification ahead of legacy Android evidence consumers", () => {
    const releaseGuard = read("scripts/release/releaseGuard.shared.ts");
    const releaseGates = releaseGuard.slice(releaseGuard.indexOf("export const REQUIRED_RELEASE_GATES"));
    const frozenPipelineIndex = releaseGates.indexOf('"android-api34-frozen-apk-pipeline-proof"');

    expect(frozenPipelineIndex).toBeGreaterThanOrEqual(0);
    for (const gate of LEGACY_ANDROID_EVIDENCE_CONSUMERS) {
      const gateIndex = releaseGates.indexOf(`"${gate}"`);
      expect(gateIndex).toBeGreaterThan(frozenPipelineIndex);
    }
  });

  it("requires API34, embedded bundle, build cache, app root, and build identity in the verifier", () => {
    const verifier = read("scripts/release/android/verifyProof.ts");

    expect(verifier).toContain("GREEN_ANDROID_API34_PIPELINE_READY");
    expect(verifier).toContain("preflight.android_actual_api !== 34");
    expect(verifier).toContain("preflight.api36_used === true");
    expect(verifier).toContain("build.android_apk_contains_embedded_bundle !== true");
    expect(verifier).toContain("build.android_build_cache_valid !== true");
    expect(verifier).toContain("smoke.android_app_root_ready !== true");
    expect(verifier).toContain("smoke.android_build_identity_matches !== true");
    expect(verifier).toContain("candidate.candidateHash !== fingerprints.candidateHash");
    expect(verifier).toContain("android_uses_metro: false");
    expect(verifier).toContain("auth_login_attempted: false");
    expect(verifier).toContain("business_route_opened: false");
  });
});
