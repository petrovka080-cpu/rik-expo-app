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

describe("Android acceptance requires API 34", () => {
  it("uses Pixel_7_API_34 on the android-34 google_apis x86_64 image", () => {
    const ensureSource = readRepoFile("scripts/e2e/ensureAndroidApi34DeviceReady.ts");
    const smokeSource = readRepoFile("scripts/e2e/runAndroidB2cRequestEmbeddedAiExpandedEstimateFixSmoke.ts");
    const releaseGuard = readRepoFile("scripts/release/releaseGuard.shared.ts");

    expect(ensureSource).toContain("Pixel_7_API_34");
    expect(ensureSource).toContain("system-images;android-34;google_apis;x86_64");
    expect(ensureSource).toContain("ro.build.version.sdk");
    expect(ensureSource).toContain("ro.product.cpu.abi");
    expect(smokeSource).toContain("ensureAndroidApi34DeviceReady");
    expect(smokeSource).toContain("api34.android_sdk !== 34");
    expect(releaseGuard).toContain("android-api34-canonical-replay-b2c-expanded-estimate-binding-proof");
    expect(releaseGuard).toContain("scripts/e2e/runAndroidApi34CanonicalReplayB2cExpandedEstimateBinding.ts");
  });

  it("runs the API34 canonical replay before legacy Android route consumers", () => {
    const releaseGuard = readRepoFile("scripts/release/releaseGuard.shared.ts");
    const api34Index = releaseGuard.indexOf('{ name: "android-api34-canonical-replay-b2c-expanded-estimate-binding-proof"');
    const routeBootstrapIndex = releaseGuard.indexOf('{ name: "android-b2c-request-embedded-ai-route-bootstrap-proof"');
    const appRootIndex = releaseGuard.indexOf('{ name: "android-app-root-ready-marker-b2c-request-embedded-ai-proof"');
    const adbReplayIndex = releaseGuard.indexOf('{ name: "android-emulator-adb-unblock-replay-b2c-expanded-estimate-fix-proof"');

    expect(api34Index).toBeGreaterThan(-1);
    expect(routeBootstrapIndex).toBeGreaterThan(-1);
    expect(appRootIndex).toBeGreaterThan(-1);
    expect(adbReplayIndex).toBeGreaterThan(-1);
    expect(api34Index).toBeLessThan(routeBootstrapIndex);
    expect(api34Index).toBeLessThan(appRootIndex);
    expect(api34Index).toBeLessThan(adbReplayIndex);
  });

  it("does not allow GREEN unless API34 device properties are proven", () => {
    const matrix = readJson("matrix.json");
    if (!matrix) {
      expect(matrix).toBeNull();
      return;
    }

    if (matrix.final_status === "GREEN_ANDROID_API34_CANONICAL_REPLAY_B2C_EXPANDED_ESTIMATE_BINDING_READY") {
      expect(matrix.avd_name).toBe("Pixel_7_API_34");
      expect(matrix.android_sdk).toBe(34);
      expect(matrix.cpu_abi).toBe("x86_64");
      expect(matrix.single_device_active).toBe(true);
    }
  });
});
