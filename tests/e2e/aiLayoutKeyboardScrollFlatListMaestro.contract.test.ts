import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("AI layout keyboard/scroll/FlatList runner contract", () => {
  it("writes exact Wave 03 artifacts without claiming fake emulator green", () => {
    const source = read("scripts/e2e/runAiLayoutKeyboardScrollFlatListMaestro.ts");

    expect(source).toContain("S_AI_LAYOUT_01_SAFE_KEYBOARD_SCROLL_FLATLIST_RUNTIME");
    expect(source).toContain("GREEN_AI_SAFE_LAYOUT_RUNTIME_READY");
    expect(source).toContain("BLOCKED_AI_SAFE_LAYOUT_CONTRACT");
    expect(source).toContain("verifyAndroidInstalledBuildRuntime");
    expect(source).toContain("ensureAndroidEmulatorReady");
    expect(source).toContain("fake_emulator_pass: false");
    expect(source).toContain("secrets_printed: false");
    expect(source).toContain("mutations_created: 0");
    expect(source).toContain("db_writes: 0");
    expect(source).toContain("provider_called: false");
    expect(source).toContain("external_live_fetch: false");
  });
});
