import fs from "node:fs";
import path from "node:path";

describe("Android app root ready marker unblock wave: release guard registered", () => {
  it("registers the app-root route proof as a required release gate", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "scripts", "release", "releaseGuard.shared.ts"), "utf8");

    expect(source).toContain("android-app-root-ready-marker-b2c-request-embedded-ai-proof");
    expect(source).toContain("artifacts/S_ANDROID_APP_ROOT_READY_MARKER_UNBLOCK_FOR_B2C_REQUEST_EMBEDDED_AI/matrix.json");
    expect(source).toContain("BLOCKED_ANDROID_ROUTE_OPEN_FAILED");
    expect(source).toContain("verifyExistingProofArtifact.ts");
  });
});
