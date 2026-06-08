import fs from "node:fs";
import path from "node:path";

function read(filePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), filePath), "utf8");
}

describe("live BOQ PDF catalog Android API34 native Metro proof", () => {
  it("uses an isolated native dev-client Metro port instead of the shared web port", () => {
    const source = read("scripts/e2e/runAndroidApi34LiveRequestEmbeddedAiProfessionalBoqPdfCatalogSmoke.ts");

    expect(source).toContain('process.env.LIVE_ANDROID_DEV_PORT ?? "8100"');
    expect(source).not.toContain('process.env.LIVE_ANDROID_DEV_PORT ?? "8081"');
    expect(source).toContain('"expo", "start", "--dev-client", "--port", String(ANDROID_DEV_PORT), "--non-interactive"');
    expect(source).not.toContain('"expo", "start", "--web", "--port", String(ANDROID_DEV_PORT)');
    expect(source).toContain('"/node_modules/expo-router/entry.bundle?platform=android');
    expect(source).toContain('sample.includes("__BUNDLE_START_TIME__")');
    expect(source).toContain("reverse\", `tcp:${ANDROID_DEV_PORT}`, `tcp:${ANDROID_DEV_PORT}`");
    expect(source).toContain("android_dev_port: ANDROID_DEV_PORT");
  });
});
