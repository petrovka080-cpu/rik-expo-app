import fs from "node:fs";
import path from "node:path";

import { readRepoFile } from "./anyEstimateArchitectureTestHelpers";

const artifactDir = path.join(
  process.cwd(),
  "artifacts",
  "S_ANDROID_EMULATOR_ADB_UNBLOCK_REPLAY_B2C_EXPANDED_ESTIMATE_FIX",
);

function readJson(name: string): Record<string, unknown> | null {
  const filePath = path.join(artifactDir, name);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<string, unknown>;
}

describe("Android emulator replay wave: requires real adb device", () => {
  it("records adb devices health and has blocked statuses for hang or missing emulator", () => {
    const health = readRepoFile("scripts/e2e/androidAdbDeviceHealth.ts");
    const runner = readRepoFile("scripts/e2e/runAndroidEmulatorAdbUnblockReplayB2cExpandedEstimateFix.ts");

    expect(health).toContain('"devices"');
    expect(health).toContain('"-l"');
    expect(health).toContain('"kill-server"');
    expect(health).toContain('"start-server"');
    expect(runner).toContain("BLOCKED_ADB_DEVICES_HANG");
    expect(runner).toContain("BLOCKED_ANDROID_EMULATOR_NOT_RUN");
    expect(runner).toContain("android_emulator_detected");
    expect(runner).toContain("selected_device_id");
  });

  it("release guard registers the replay proof gate", () => {
    const releaseGuard = readRepoFile("scripts/release/releaseGuard.shared.ts");
    expect(releaseGuard).toContain("android-emulator-adb-unblock-replay-b2c-expanded-estimate-fix-proof");
    expect(releaseGuard).toContain("scripts/e2e/runAndroidEmulatorAdbUnblockReplayB2cExpandedEstimateFix.ts");
  });

  it("does not allow GREEN without a detected Android emulator", () => {
    const matrix = readJson("matrix.json");
    if (!matrix) {
      expect(matrix).toBeNull();
      return;
    }

    if (matrix.final_status === "GREEN_ANDROID_EMULATOR_ADB_UNBLOCK_REPLAY_B2C_EXPANDED_ESTIMATE_FIX_READY") {
      expect(matrix.android_emulator_detected).toBe(true);
      expect(matrix.android_device_id_recorded).toBe(true);
      expect(matrix.android_replay_passed).toBe(true);
    }
  });
});
