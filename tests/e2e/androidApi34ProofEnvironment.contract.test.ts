import fs from "node:fs";
import path from "node:path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

function read(filePath: string): string {
  return fs.readFileSync(path.join(PROJECT_ROOT, filePath), "utf8");
}

describe("Android API34 proof environment", () => {
  it("requires API34 and rejects API36 as an acceptance substitute", () => {
    const ensureSource = read("scripts/e2e/ensureAndroidApi34DeviceReady.ts");
    const liveSmoke = read("scripts/e2e/runAndroidApi34LiveRequestEmbeddedAiProfessionalBoqPdfCatalogSmoke.ts");

    expect(ensureSource).toContain('API34_AVD_NAME = "Pixel_7_API_34"');
    expect(ensureSource).toContain("androidSdk === 34");
    expect(ensureSource).toContain("BLOCKED_ANDROID_API36_NOT_ALLOWED_FOR_ACCEPTANCE");
    expect(liveSmoke).toContain("actual_api: device.android_sdk");
    expect(liveSmoke).toContain("api36_rejected");
  });

  it("uses bounded UI dump and screenshot timeouts and native Metro", () => {
    const liveSmoke = read("scripts/e2e/runAndroidApi34LiveRequestEmbeddedAiProfessionalBoqPdfCatalogSmoke.ts");
    const harness = read("scripts/e2e/androidRouteBootstrapHarness.ts");

    expect(liveSmoke).toContain("ANDROID_DEV_PORT");
    expect(liveSmoke).toContain("--dev-client");
    expect(liveSmoke).toContain("entry.bundle?platform=android");
    expect(liveSmoke).toContain("uiautomator");
    expect(liveSmoke).toContain("20_000");
    expect(liveSmoke).toContain("screencap");
    expect(liveSmoke).toContain("15_000");
    expect(harness).toContain("uiautomator");
    expect(harness).toContain("8000");
    expect(harness).toContain("isBlankOrSystemSurface");
  });
});
