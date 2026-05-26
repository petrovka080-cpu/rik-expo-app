import fs from "node:fs";
import path from "node:path";

import { readRepoFile } from "./anyEstimateArchitectureTestHelpers";

const artifactDir = path.join(
  process.cwd(),
  "artifacts",
  "S_ANDROID_API34_CANONICAL_REPLAY_B2C_EXPANDED_ESTIMATE_BINDING",
);

function readJson(name: string): Record<string, unknown> | null {
  const filePath = path.join(artifactDir, name);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<string, unknown>;
}

describe("Android acceptance rejects API 36", () => {
  it("hard-codes API36/16K rejection for Android acceptance", () => {
    const ensureSource = readRepoFile("scripts/e2e/ensureAndroidApi34DeviceReady.ts");
    const replaySource = readRepoFile("scripts/e2e/runAndroidApi34CanonicalReplayB2cExpandedEstimateBinding.ts");

    expect(`${ensureSource}\n${replaySource}`).toContain("BLOCKED_ANDROID_API36_NOT_ALLOWED_FOR_ACCEPTANCE");
    expect(ensureSource).toContain("sdk_gphone16k");
    expect(ensureSource).toContain("API36_16K_EMULATOR_ADB_TRANSPORT_BUG");
    expect(replaySource).toContain("api36_rejected_for_acceptance");
  });

  it("does not allow GREEN if API36 is active or SDK is not 34", () => {
    const matrix = readJson("matrix.json");
    if (!matrix) {
      expect(matrix).toBeNull();
      return;
    }

    if (matrix.final_status === "GREEN_ANDROID_API34_CANONICAL_REPLAY_B2C_EXPANDED_ESTIMATE_BINDING_READY") {
      expect(matrix.api36_active_for_acceptance).toBe(false);
      expect(matrix.android_sdk).toBe(34);
      expect(matrix.api36_rejected_for_acceptance).toBe(true);
    }
  });
});
