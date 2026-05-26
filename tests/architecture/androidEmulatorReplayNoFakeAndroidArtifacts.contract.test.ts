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

function containsPlaceholder(value: unknown): boolean {
  if (typeof value === "string") {
    return /\bplaceholder\b|fake screenshot|fake xml|captured from code analysis|not a real file/i.test(value);
  }
  if (Array.isArray(value)) return value.some(containsPlaceholder);
  if (value && typeof value === "object") return Object.values(value).some(containsPlaceholder);
  return false;
}

describe("Android emulator replay wave: no fake Android artifacts", () => {
  it("captures screenshots and UI dumps through adb helpers, not placeholder files", () => {
    const runner = readRepoFile("scripts/e2e/runAndroidEmulatorAdbUnblockReplayB2cExpandedEstimateFix.ts");
    expect(runner).toContain("captureScreenInDir");
    expect(runner).toContain("fileIsReal");
    expect(runner).toContain("hasPlaceholderText");
    expect(runner).not.toMatch(/fake screenshot|fake xml/i);
  });

  it("does not allow GREEN with placeholders or missing Android artifacts", () => {
    const matrix = readJson("matrix.json");
    if (!matrix) {
      expect(matrix).toBeNull();
      return;
    }

    expect(matrix.fake_green_claimed).toBe(false);
    expect(containsPlaceholder(matrix)).toBe(false);

    if (matrix.final_status === "GREEN_ANDROID_EMULATOR_ADB_UNBLOCK_REPLAY_B2C_EXPANDED_ESTIMATE_FIX_READY") {
      expect(matrix.android_screenshots_real).toBe(true);
      expect(matrix.android_ui_dumps_real).toBe(true);
      expect(matrix.android_emulator_detected).toBe(true);
      expect(matrix.generic_known_work_rows_found).toBe(false);
    }
  });
});
