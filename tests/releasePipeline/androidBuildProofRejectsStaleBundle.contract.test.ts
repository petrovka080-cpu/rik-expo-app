import {
  androidPublicRuntimeEnvProof,
  gradleReleaseBuildEnv,
} from "../../scripts/release/android/shared";
import { expectFileToContain } from "./releasePipelineContractUtils";

describe("Android API34 build proof stale bundle guard", () => {
  it("forces release bundle regeneration and rejects candidate identity mismatches", () => {
    expectFileToContain("scripts/release/android/shared.ts", "\"--rerun-tasks\", \"assembleRelease\"");
    expectFileToContain("scripts/release/android/shared.ts", "releaseBundleContainsCurrentIdentity");
    expectFileToContain("scripts/release/android/shared.ts", "bundle.includes(candidate.candidateHash)");
    expectFileToContain("scripts/release/android/shared.ts", "bundle.includes(candidate.productSourceHash)");
    expectFileToContain("scripts/release/android/buildProofApk.ts", "inspectCachedApk");
    expectFileToContain("scripts/release/android/buildProofApk.ts", "staleCacheRejected");
    expectFileToContain("scripts/release/android/buildProofApk.ts", "fs.rmSync(cachedApk, { force: true })");
    expectFileToContain("scripts/release/android/buildProofApk.ts", "cacheHit = prebuildCache.valid");
    expectFileToContain("scripts/release/android/buildProofApk.ts", "EMBEDDED_JS_BUNDLE_IDENTITY_MISMATCH");
    expectFileToContain("scripts/release/android/buildProofApk.ts", "android_apk_embedded_identity_matches");
    expectFileToContain("scripts/release/android/buildProofApk.ts", "PUBLIC_RUNTIME_ENV_MISSING");
    expectFileToContain("scripts/release/android/buildProofApk.ts", "EMBEDDED_PUBLIC_RUNTIME_ENV_MISMATCH");
    expectFileToContain("scripts/release/android/buildProofApk.ts", "cachedBuildEnvDigestMatches");
    expectFileToContain("scripts/release/android/buildProofApk.ts", "raw_values_persisted: false");
  });

  it("builds Gradle proof env with candidate identity and without CI cache suppression", () => {
    const originalCi = process.env.CI;
    process.env.CI = "1";
    try {
      const env = gradleReleaseBuildEnv({
        sourceTreeHash: "source-tree-hash",
        productSourceHash: "product-source-hash",
        nativeBuildHash: "native-build-hash",
        jsBundleFingerprint: "js-bundle-fingerprint",
        proofHarnessHash: "proof-harness-hash",
        candidateHash: "candidate-hash",
        apkBuildKey: "apk-build-key",
      } as never);

      expect(env.CI).toBeUndefined();
      expect(env.EXPO_PUBLIC_RELEASE_SOURCE_TREE_HASH).toBe("source-tree-hash");
      expect(env.EXPO_PUBLIC_RELEASE_PRODUCT_SOURCE_HASH).toBe("product-source-hash");
      expect(env.EXPO_PUBLIC_RELEASE_CANDIDATE_HASH).toBe("candidate-hash");
      expect(env.EXPO_PUBLIC_RELEASE_APK_BUILD_KEY).toBe("apk-build-key");
      expect(env.NODE_ENV).toBe("production");
      expect(env.SENTRY_DISABLE_AUTO_UPLOAD).toBe("true");
    } finally {
      if (originalCi === undefined) {
        delete process.env.CI;
      } else {
        process.env.CI = originalCi;
      }
    }
  });

  it("hashes the required public runtime build env without persisting raw values", () => {
    const first = androidPublicRuntimeEnvProof({
      NODE_ENV: "test",
      EXPO_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      EXPO_PUBLIC_SUPABASE_ANON_KEY: "public-anon-value",
      EXPO_PUBLIC_CANONICAL_ESTIMATE_FUNCTION_URL: "http://10.0.2.2:8765/canonical-estimate",
      EXPO_PUBLIC_CANONICAL_ESTIMATE_ALLOW_INSECURE_LOOPBACK: "true",
    });
    const second = androidPublicRuntimeEnvProof({
      NODE_ENV: "test",
      EXPO_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      EXPO_PUBLIC_SUPABASE_ANON_KEY: "another-public-anon-value",
      EXPO_PUBLIC_CANONICAL_ESTIMATE_FUNCTION_URL: "http://10.0.2.2:8765/canonical-estimate",
      EXPO_PUBLIC_CANONICAL_ESTIMATE_ALLOW_INSECURE_LOOPBACK: "true",
    });
    const missing = androidPublicRuntimeEnvProof({ NODE_ENV: "test" });

    expect(first.missingKeys).toEqual([]);
    expect(first.digest).toMatch(/^[a-f0-9]{64}$/);
    expect(second.digest).not.toBe(first.digest);
    expect(missing.digest).toBeNull();
    expect(missing.missingKeys).toEqual([
      "EXPO_PUBLIC_SUPABASE_URL",
      "EXPO_PUBLIC_SUPABASE_ANON_KEY",
      "EXPO_PUBLIC_CANONICAL_ESTIMATE_FUNCTION_URL",
      "EXPO_PUBLIC_CANONICAL_ESTIMATE_ALLOW_INSECURE_LOOPBACK",
    ]);
  });
});
