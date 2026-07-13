import fs from "node:fs";
import path from "node:path";

import { RELEASE_PIPELINE_ARTIFACT_DIR, computeReleaseFingerprints } from "../release/computeReleaseFingerprints";

function readJson(filePath: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<string, unknown>;
}

function main(): void {
  const fingerprints = computeReleaseFingerprints();
  const liveAndroidPath = path.join(process.cwd(), "artifacts", "S_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG", "android_api34_results.json");
  const liveAndroid = readJson(liveAndroidPath);
  const replayPath = path.join(RELEASE_PIPELINE_ARTIFACT_DIR, "android_replay.json");
  const replay = fs.existsSync(replayPath) ? readJson(replayPath) : null;
  const failures: string[] = [];
  if (liveAndroid.final_status !== "GREEN_ANDROID_API34_LIVE_BOQ_PDF_CATALOG_READY") failures.push("ANDROID_LIVE_PROOF_NOT_GREEN");
  if (liveAndroid.actual_api !== 34) failures.push("ANDROID_ACTUAL_API_NOT_34");
  if (liveAndroid.api36_rejected !== true) failures.push("API36_NOT_REJECTED");
  if (Array.isArray(liveAndroid.failures) && liveAndroid.failures.length > 0) failures.push("ANDROID_FAILURES_NOT_EMPTY");
  if (liveAndroid.fake_green_claimed !== false) failures.push("ANDROID_FAKE_GREEN");
  if (replay?.sourceTreeHash !== fingerprints.sourceTreeHash) failures.push("ANDROID_REPLAY_SOURCE_TREE_HASH_MISMATCH");

  const passed = failures.length === 0;
  const artifact = {
    final_status: passed ? "GREEN_ANDROID_API34_VERIFY_READY" : "BLOCKED_ANDROID_API34_VERIFY",
    source_tree_hash: fingerprints.sourceTreeHash,
    native_build_fingerprint: fingerprints.nativeBuildFingerprint,
    js_bundle_fingerprint: fingerprints.jsBundleFingerprint,
    proof_harness_fingerprint: fingerprints.proofHarnessFingerprint,
    android_actual_api: liveAndroid.actual_api,
    api36_used_as_substitute: false,
    android_verify_read_only: true,
    gradle_invoked: false,
    adb_install_invoked: false,
    adb_push_invoked: false,
    pm_install_invoked: false,
    artifact_rewrite_from_verify: false,
    failures,
    fake_green_claimed: false,
  };
  fs.mkdirSync(RELEASE_PIPELINE_ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(RELEASE_PIPELINE_ARTIFACT_DIR, "android_verify.json"), `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(artifact, null, 2));
  if (!passed) process.exit(1);
}

main();
