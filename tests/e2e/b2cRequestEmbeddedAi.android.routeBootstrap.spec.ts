import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { expect, test } from "playwright/test";

const ARTIFACT_DIR = path.resolve(
  process.cwd(),
  "artifacts",
  "S_ANDROID_B2C_REQUEST_EMBEDDED_AI_ROUTE_BOOTSTRAP",
);
const MATRIX_PATH = path.join(ARTIFACT_DIR, "matrix.json");

test.describe("Android B2C request and embedded AI route bootstrap", () => {
  test("captures real Android route-bootstrap proof artifacts", async () => {
    test.skip(
      process.env.RUN_ANDROID_ROUTE_BOOTSTRAP_SPEC !== "1",
      "Set RUN_ANDROID_ROUTE_BOOTSTRAP_SPEC=1 to run the Android emulator route bootstrap proof from Playwright.",
    );

    const result = execFileSync("npx", ["tsx", "scripts/e2e/runAndroidB2cRequestEmbeddedAiRouteBootstrapProof.ts"], {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: "pipe",
      timeout: 180_000,
    });
    expect(result).toContain("GREEN_ANDROID_B2C_REQUEST_EMBEDDED_AI_ROUTE_BOOTSTRAP_READY");
    expect(fs.existsSync(MATRIX_PATH)).toBe(true);
    const matrix = JSON.parse(fs.readFileSync(MATRIX_PATH, "utf8")) as Record<string, unknown>;
    expect(matrix.final_status).toBe("GREEN_ANDROID_B2C_REQUEST_EMBEDDED_AI_ROUTE_BOOTSTRAP_READY");
    expect(matrix.request_route_opened).toBe(true);
    expect(matrix.embedded_ai_route_opened).toBe(true);
    expect(matrix.android_screenshots_real).toBe(true);
    expect(matrix.android_ui_dumps_real).toBe(true);
    expect(matrix.fake_green_claimed).toBe(false);
  });
});
