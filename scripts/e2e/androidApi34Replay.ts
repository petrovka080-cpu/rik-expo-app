import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { RELEASE_PIPELINE_ARTIFACT_DIR, computeReleaseFingerprints } from "../release/computeReleaseFingerprints";
import { loadReleaseCandidate, writeReleaseCandidate } from "../release/releaseCandidateState";

function main(): void {
  fs.mkdirSync(RELEASE_PIPELINE_ARTIFACT_DIR, { recursive: true });
  const fingerprints = computeReleaseFingerprints();
  const result = spawnSync(
    "node",
    [
      "node_modules/tsx/dist/cli.mjs",
      "scripts/e2e/runAndroidApi34LiveRequestEmbeddedAiProfessionalBoqPdfCatalogSmoke.ts",
      "--mode=refresh",
      "--skip-install",
    ],
    {
      cwd: process.cwd(),
      stdio: "inherit",
      shell: process.platform === "win32",
      env: { ...process.env, ANDROID_API34_SKIP_INSTALL: "true" },
    },
  );
  const passed = result.status === 0;
  const artifact = {
    final_status: passed ? "GREEN_ANDROID_API34_REPLAY_READY" : "BLOCKED_ANDROID_API34_REPLAY_FAILED",
    ...fingerprints,
    replay_exit_code: result.status,
    gradle_invoked: false,
    apk_install_invoked: false,
    avd_recreated: false,
    fake_green_claimed: false,
  };
  fs.writeFileSync(path.join(RELEASE_PIPELINE_ARTIFACT_DIR, "android_replay.json"), `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  if (passed) {
    const candidate = loadReleaseCandidate();
    writeReleaseCandidate({
      ...candidate,
      android_replays_for_candidate: candidate.android_replays_for_candidate + 1,
      updated_at: new Date().toISOString(),
    });
  }
  console.log(JSON.stringify(artifact, null, 2));
  if (!passed) process.exit(1);
}

main();
