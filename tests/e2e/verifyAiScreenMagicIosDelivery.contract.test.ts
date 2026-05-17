import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("AI screen magic iOS delivery proof", () => {
  const source = read("scripts/e2e/verifyAiScreenMagicIosDelivery.ts");

  it("documents iOS delivery without treating Android proof as iOS proof", () => {
    expect(source).toContain("S_MOBILE_AI_RUNTIME_DELIVERY_TARGETABILITY_SIGNOFF");
    expect(source).toContain("ios_delivery_path");
    expect(source).toContain("android_proof_used_as_ios_proof: false");
    expect(source).not.toMatch(/android_proof_used_as_ios_proof:\s*true/);
  });

  it("requires real iOS runtime targetability for core AI routes", () => {
    expect(source).toContain("rik:///ai-command-center");
    expect(source).toContain("rik:///ai-procurement-copilot");
    expect(source).toContain("rik:///ai-approval-inbox");
    expect(source).toContain("ios_latest_app_code_visible");
    expect(source).toContain("ios_ai_dialog_usable");
    expect(source).toContain("ios_keyboard_safe");
  });

  it("writes scoped magic-wave iOS artifacts instead of reusing the mobile signoff artifact", () => {
    expect(source).toContain("artifactWaveForScope(scope)");
    expect(source).toContain("S_AI_MAGIC_PROCUREMENT_NATIVE_ASSISTANT_CLOSEOUT");
    expect(source).toContain("routesForScope(scope)");
    expect(source).toContain("artifactPathsForScope(artifact.wave)");
  });

  it("does not rebuild or publish OTA as part of verification", () => {
    expect(source).toContain("ota_published: false");
    expect(source).toContain("native_build_started: false");
    expect(source).not.toContain("eas update");
    expect(source).not.toContain("eas build");
  });
});
