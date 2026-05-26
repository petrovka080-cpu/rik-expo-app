import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { expect, test } from "playwright/test";

const artifactDir = path.join(
  process.cwd(),
  "artifacts",
  "S_ANDROID_APP_ROOT_READY_MARKER_UNBLOCK_FOR_B2C_REQUEST_EMBEDDED_AI",
);

test.describe("Android app root ready marker unblock proof", () => {
  test.skip(process.env.RUN_ANDROID_APP_ROOT_READY_MARKER_SPEC !== "1", "Runs only in an adb/emulator-enabled environment.");

  test("proves app root and target routes on Android", () => {
    execFileSync("npx", ["tsx", "scripts/e2e/runAndroidAppRootReadyMarkerUnblockForB2cRequestEmbeddedAiProof.ts"], {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: "pipe",
      timeout: 240_000,
    });

    const matrixPath = path.join(artifactDir, "matrix.json");
    expect(fs.existsSync(matrixPath)).toBe(true);
    const matrix = JSON.parse(fs.readFileSync(matrixPath, "utf8")) as Record<string, unknown>;
    expect(matrix.final_status).toBe("GREEN_ANDROID_APP_ROOT_AND_ROUTE_PROOF_READY");
    expect(matrix.app_root_ready_marker_proven).toBe(true);
    expect(matrix.request_route_ready_marker_proven).toBe(true);
    expect(matrix.embedded_ai_route_ready_marker_proven).toBe(true);
    expect(matrix.fake_green_claimed).toBe(false);
  });
});
