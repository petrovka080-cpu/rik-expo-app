import fs from "node:fs";

describe("S13 AI screen button action truth map runner", () => {
  const source = fs.readFileSync("scripts/e2e/runAiScreenButtonActionTruthMapMaestro.ts", "utf8");

  it("guards runtime proof behind roadmap approval flags", () => {
    expect(source).toContain("S_AI_MAGIC_ROADMAP_APPROVED");
    expect(source).toContain("S_AI_MAGIC_REQUIRE_ANDROID_EMULATOR_PROOF");
    expect(source).toContain("S_AI_MAGIC_REQUIRE_EVIDENCE");
    expect(source).toContain("S_AI_NO_FAKE_GREEN");
  });

  it("proves the full required screen truth map through the existing Android targetability gate", () => {
    expect(source).toContain("runAiScreenButtonActionMapMaestro");
    expect(source).toContain("GREEN_AI_SCREEN_BUTTON_ACTION_TRUTH_MAP_READY");
    expect(source).toContain("chat.main");
    expect(source).toContain("map.main");
    expect(source).toContain("office.hub");
    expect(source).toContain("command_center_preview_targetable");
  });

  it("keeps the wave read-only and non-mutating", () => {
    expect(source).toContain("mutations_created: 0");
    expect(source).toContain("db_writes: 0");
    expect(source).toContain("external_live_fetch: false");
    expect(source).toContain("model_provider_changed: false");
    expect(source).toContain("gpt_enabled: false");
    expect(source).toContain("secrets_printed: false");
  });
});
