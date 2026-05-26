import fs from "node:fs";
import path from "node:path";

describe("Android app root ready marker unblock wave: release guard registered", () => {
  it("registers the app-root route proof as a required release gate", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "scripts", "release", "releaseGuard.shared.ts"), "utf8");

    expect(source).toContain("android-app-root-ready-marker-b2c-request-embedded-ai-proof");
    expect(source).toContain("scripts/e2e/runAndroidAppRootReadyMarkerUnblockForB2cRequestEmbeddedAiProof.ts");
  });
});
