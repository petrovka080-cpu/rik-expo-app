import fs from "node:fs";
import path from "node:path";

import {
  androidPublicRuntimeEnvProof,
  apkContainsEmbeddedBundle,
  getCandidate,
  releaseBundleContainsRequiredPublicRuntimeEnv,
  releaseBundleContainsCurrentIdentity,
  sha256File,
  spawnGradleAssembleRelease,
  writeAndroidJson,
} from "./shared";

const RELEASE_APK = path.join(process.cwd(), "android", "app", "build", "outputs", "apk", "release", "app-release.apk");

function inspectCachedApk(
  cachedApk: string,
  cachedBuildEnvPath: string,
  candidate: ReturnType<typeof getCandidate>,
  publicRuntimeEnv: ReturnType<typeof androidPublicRuntimeEnvProof>,
): {
  apkExists: boolean;
  embeddedBundle: boolean;
  embeddedIdentityMatches: boolean;
  publicRuntimeEnvEmbedded: boolean;
  cachedBuildEnvDigestMatches: boolean;
  valid: boolean;
} {
  const apkExists = fs.existsSync(cachedApk);
  const embeddedBundle = apkExists ? apkContainsEmbeddedBundle(cachedApk) : false;
  const embeddedIdentityMatches = apkExists ? releaseBundleContainsCurrentIdentity(candidate) : false;
  const publicRuntimeEnvEmbedded = apkExists
    ? releaseBundleContainsRequiredPublicRuntimeEnv(publicRuntimeEnv)
    : false;
  let cachedBuildEnvDigest: string | null = null;
  if (fs.existsSync(cachedBuildEnvPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(cachedBuildEnvPath, "utf8")) as {
        public_runtime_env_digest?: unknown;
      };
      cachedBuildEnvDigest = typeof parsed.public_runtime_env_digest === "string"
        ? parsed.public_runtime_env_digest
        : null;
    } catch {
      cachedBuildEnvDigest = null;
    }
  }
  const cachedBuildEnvDigestMatches = Boolean(
    publicRuntimeEnv.digest &&
      cachedBuildEnvDigest === publicRuntimeEnv.digest,
  );
  return {
    apkExists,
    embeddedBundle,
    embeddedIdentityMatches,
    publicRuntimeEnvEmbedded,
    cachedBuildEnvDigestMatches,
    valid:
      apkExists &&
      embeddedBundle &&
      embeddedIdentityMatches &&
      publicRuntimeEnvEmbedded &&
      cachedBuildEnvDigestMatches,
  };
}

function main(): void {
  const candidate = getCandidate();
  const cacheDir = path.join(process.cwd(), ".cache", "release", "android", candidate.apkBuildKey);
  const cachedApk = path.join(cacheDir, "app-release.apk");
  const cachedBuildEnvPath = path.join(cacheDir, "build-env.json");
  const publicRuntimeEnv = androidPublicRuntimeEnvProof();
  let built = false;
  const prebuildCache = inspectCachedApk(
    cachedApk,
    cachedBuildEnvPath,
    candidate,
    publicRuntimeEnv,
  );
  const publicRuntimeEnvReady =
    publicRuntimeEnv.missingKeys.length === 0 && Boolean(publicRuntimeEnv.digest);
  const staleCacheRejected =
    publicRuntimeEnvReady && prebuildCache.apkExists && !prebuildCache.valid;
  let cacheHit = prebuildCache.valid;
  const failures: string[] = publicRuntimeEnv.missingKeys.map(
    (key) => `PUBLIC_RUNTIME_ENV_MISSING:${key}`,
  );

  if (staleCacheRejected) {
    fs.rmSync(cachedApk, { force: true });
    fs.rmSync(cachedBuildEnvPath, { force: true });
  }

  if (!cacheHit && failures.length === 0) {
    const exitCode = spawnGradleAssembleRelease(candidate);
    built = true;
    if (exitCode !== 0) failures.push("GRADLE_ASSEMBLE_RELEASE_FAILED");
    if (!fs.existsSync(RELEASE_APK)) failures.push("RELEASE_APK_MISSING_AFTER_BUILD");
    if (!releaseBundleContainsRequiredPublicRuntimeEnv(publicRuntimeEnv)) {
      failures.push("EMBEDDED_PUBLIC_RUNTIME_ENV_MISMATCH");
    }
    if (failures.length === 0) {
      fs.mkdirSync(cacheDir, { recursive: true });
      fs.copyFileSync(RELEASE_APK, cachedApk);
      fs.writeFileSync(
        cachedBuildEnvPath,
        `${JSON.stringify({
          schema_version: "android-public-runtime-env.v1",
          required_keys: publicRuntimeEnv.requiredKeys,
          public_runtime_env_digest: publicRuntimeEnv.digest,
          raw_values_persisted: false,
        }, null, 2)}\n`,
        "utf8",
      );
    }
  }

  const postbuildCache = inspectCachedApk(
    cachedApk,
    cachedBuildEnvPath,
    candidate,
    publicRuntimeEnv,
  );
  cacheHit = prebuildCache.valid && !built;
  const {
    apkExists,
    embeddedBundle,
    embeddedIdentityMatches,
    publicRuntimeEnvEmbedded,
    cachedBuildEnvDigestMatches,
  } = postbuildCache;
  if (!apkExists) failures.push("CACHED_APK_MISSING");
  if (apkExists && !embeddedBundle) failures.push("EMBEDDED_JS_BUNDLE_MISSING");
  if (apkExists && !embeddedIdentityMatches) failures.push("EMBEDDED_JS_BUNDLE_IDENTITY_MISMATCH");
  if (apkExists && !publicRuntimeEnvEmbedded) failures.push("EMBEDDED_PUBLIC_RUNTIME_ENV_MISMATCH");
  if (apkExists && !cachedBuildEnvDigestMatches) failures.push("CACHED_BUILD_ENV_DIGEST_MISMATCH");

  const passed = failures.length === 0;
  const artifact = {
    final_status: passed ? "GREEN_ANDROID_API34_PIPELINE_BUILD_READY" : "BLOCKED_ANDROID_API34_PIPELINE_BUILD",
    candidate_id: candidate.candidate_id,
    product_source_hash: candidate.productSourceHash,
    native_build_hash: candidate.nativeBuildHash,
    proof_harness_hash: candidate.proofHarnessHash,
    candidate_hash: candidate.candidateHash,
    apk_build_key: candidate.apkBuildKey,
    build_profile: candidate.buildProfile,
    apk_path: cachedApk,
    apk_sha256: apkExists ? sha256File(cachedApk) : null,
    cache_hit: cacheHit,
    stale_cache_rejected: staleCacheRejected,
    built,
    android_build_cache_valid: passed,
    android_apk_contains_embedded_bundle: embeddedBundle,
    android_apk_embedded_identity_matches: embeddedIdentityMatches,
    android_public_runtime_env_required_keys: publicRuntimeEnv.requiredKeys,
    android_public_runtime_env_digest: publicRuntimeEnv.digest,
    android_public_runtime_env_embedded: publicRuntimeEnvEmbedded,
    android_cached_build_env_digest_matches: cachedBuildEnvDigestMatches,
    android_public_runtime_env_raw_values_persisted: false,
    android_uses_dev_client: false,
    android_uses_metro: false,
    metro_required: false,
    gradle_invoked: built,
    failures,
    fake_green_claimed: false,
  };
  writeAndroidJson(candidate, "build.json", artifact);
  console.log(JSON.stringify(artifact, null, 2));
  if (!passed) process.exit(1);
}

main();
