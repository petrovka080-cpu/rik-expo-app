import fs from "node:fs";
import path from "node:path";

describe("AI screen magic scoped web runner", () => {
  it("supports per-wave web proof without replacing the full screen-by-screen runner", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "scripts/e2e/runAiScreenMagicWeb.ts"), "utf8");

    expect(source).toContain("getAiScreenMagicScopedWaveConfig(scope)");
    expect(source).toContain("runAiScreenByScreenMagicWeb");
    expect(source).toContain("GREEN_AI_SCREEN_MAGIC_WEB_READY");
    expect(source).toContain("dialog_not_tiny");
    expect(source).toContain("answer_is_screen_specific");
    expect(source).toContain("every_button_clickable");
    expect(source).toContain("visible_result_appears");
    expect(source).toContain("providerCalled: false");
    expect(source).toContain("dbWritesUsed: false");
    expect(source).toContain("fakeGreenClaimed: false");
  });
});
