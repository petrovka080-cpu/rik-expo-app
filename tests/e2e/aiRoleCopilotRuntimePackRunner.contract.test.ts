import fs from "node:fs";

describe("S15 AI role copilot runtime pack runner", () => {
  const source = fs.readFileSync("scripts/e2e/runAiRoleCopilotRuntimePackMaestro.ts", "utf8");

  it("guards Wave 15 behind roadmap and developer/control approvals", () => {
    expect(source).toContain("S_AI_MAGIC_15_ROLE_COPILOT_RUNTIME_PACK");
    expect(source).toContain("S_AI_MAGIC_ROADMAP_APPROVED");
    expect(source).toContain("S_AI_MAGIC_REQUIRE_ANDROID_EMULATOR_PROOF");
    expect(source).toContain("S_AI_MAGIC_REQUIRE_ROLE_SCOPE");
    expect(source).toContain("S_AI_MAGIC_REQUIRE_APPROVAL_FOR_HIGH_RISK");
    expect(source).toContain("S_AI_DEVELOPER_CONTROL_FULL_ACCESS_APPROVED");
    expect(source).toContain("S_AI_SINGLE_OWNER_ACCOUNT_MODE_APPROVED");
    expect(source).toContain("S_AI_NO_FAKE_GREEN");
    expect(source).toContain("S_AI_NO_SECRETS_PRINTING");
  });

  it("uses the existing real Android and developer/control runtime gates", () => {
    expect(source).toContain("verifyAndroidInstalledBuildRuntime");
    expect(source).toContain("runDeveloperControlFullAccessMaestro");
    expect(source).toContain("GREEN_ANDROID_POST_INSTALL_RUNTIME_SIGNOFF");
    expect(source).toContain("GREEN_DEVELOPER_CONTROL_FULL_ACCESS_RUNTIME_TARGETABILITY");
    expect(source).toContain("GREEN_AI_ROLE_COPILOT_RUNTIME_PACK_READY");
  });

  it("records honest single-owner mode without fake role isolation or mutations", () => {
    expect(source).toContain("single_owner_account_mode: true");
    expect(source).toContain("role_isolation_e2e_claimed: false");
    expect(source).toContain("role_isolation_contract_proof");
    expect(source).toContain("default_tools_executable");
    expect(source).toContain("mutation_count: 0");
    expect(source).toContain("db_writes: 0");
    expect(source).toContain("external_live_fetch: false");
    expect(source).toContain("direct_supabase_from_ui: false");
    expect(source).toContain("model_provider_changed: false");
    expect(source).toContain("gpt_enabled: false");
    expect(source).toContain("gemini_removed: false");
    expect(source).toContain("fake_green_claimed: false");
    expect(source).toContain("secrets_printed: false");
  });
});
