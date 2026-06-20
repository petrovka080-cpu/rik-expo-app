import fs from "node:fs";
import path from "node:path";

import {
  apkContainsEmbeddedBundle,
  getCandidate,
  sha256File,
  spawnGradleAssembleRelease,
  writeAndroidJson,
} from "./shared";

const RELEASE_APK = path.join(process.cwd(), "android", "app", "build", "outputs", "apk", "release", "app-release.apk");

function main(): void {
  const candidate = getCandidate();
  const cacheDir = path.join(process.cwd(), ".cache", "release", "android", candidate.apkBuildKey);
  const cachedApk = path.join(cacheDir, "app-release.apk");
  let built = false;
  let cacheHit = fs.existsSync(cachedApk);
  const failures: string[] = [];

  if (!cacheHit) {
    const exitCode = spawnGradleAssembleRelease(candidate);
    built = true;
    if (exitCode !== 0) failures.push("GRADLE_ASSEMBLE_RELEASE_FAILED");
    if (!fs.existsSync(RELEASE_APK)) failures.push("RELEASE_APK_MISSING_AFTER_BUILD");
    if (failures.length === 0) {
      fs.mkdirSync(cacheDir, { recursive: true });
      fs.copyFileSync(RELEASE_APK, cachedApk);
    }
  }

  cacheHit = fs.existsSync(cachedApk) && !built;
  const apkExists = fs.existsSync(cachedApk);
  const embeddedBundle = apkExists ? apkContainsEmbeddedBundle(cachedApk) : false;
  if (!apkExists) failures.push("CACHED_APK_MISSING");
  if (apkExists && !embeddedBundle) failures.push("EMBEDDED_JS_BUNDLE_MISSING");

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
    built,
    android_build_cache_valid: passed,
    android_apk_contains_embedded_bundle: embeddedBundle,
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
