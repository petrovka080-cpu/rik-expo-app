import fs from "node:fs";

describe("S14 AI proactive workday task intelligence runner", () => {
  const source = fs.readFileSync(
    "scripts/e2e/runAiProactiveWorkdayTaskIntelligenceWave14Maestro.ts",
    "utf8",
  );

  it("guards the canonical Wave 14 closeout behind roadmap approval flags", () => {
    expect(source).toContain("S_AI_MAGIC_14_PROACTIVE_WORKDAY_TASK_INTELLIGENCE");
    expect(source).toContain("S_AI_MAGIC_ROADMAP_APPROVED");
    expect(source).toContain("S_AI_MAGIC_REQUIRE_ANDROID_EMULATOR_PROOF");
    expect(source).toContain("S_AI_MAGIC_REQUIRE_EVIDENCE");
    expect(source).toContain("S_AI_MAGIC_REQUIRE_ROLE_SCOPE");
    expect(source).toContain("S_AI_NO_FAKE_GREEN");
    expect(source).toContain("S_AI_NO_FAKE_CARDS");
  });

  it("reuses the existing real Android runtime runner instead of introducing a second UI path", () => {
    expect(source).toContain("runAiProactiveWorkdayTaskIntelligenceMaestro");
    expect(source).toContain("upstream_runtime_runner");
    expect(source).toContain("canonical_wave_closeout");
    expect(source).toContain("command_center_workday_section_visible");
  });

  it("keeps the wave read-only and provider-neutral", () => {
    expect(source).toContain("mutation_count: 0");
    expect(source).toContain("db_writes: 0");
    expect(source).toContain("external_live_fetch: false");
    expect(source).toContain("model_provider_changed: false");
    expect(source).toContain("gpt_enabled: false");
    expect(source).toContain("gemini_removed: false");
    expect(source).toContain("secrets_printed: false");
  });
});
