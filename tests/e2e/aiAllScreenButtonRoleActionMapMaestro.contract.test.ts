import fs from "node:fs";

describe("S_AI_AUDIT_02 all-screen button role action map runtime runner", () => {
  const source = fs.readFileSync("scripts/e2e/runAiAllScreenButtonRoleActionMapMaestro.ts", "utf8");

  it("uses Android runtime smoke and audit targetability instead of exact LLM assertions", () => {
    expect(source).toContain("verifyAndroidInstalledBuildRuntime");
    expect(source).toContain("android_runtime_audit_targetability");
    expect(source).toContain("exact_llm_text_required: false");
    expect(source).toContain("KEY_AI_SURFACE_SCREEN_IDS");
    expect(source).toContain("ai.command_center");
    expect(source).toContain("approval.inbox");
    expect(source).toContain("procurement.copilot");
    expect(source).toContain("screen.runtime");
  });

  it("keeps the audit runner read-only and non-mutating", () => {
    expect(source).toContain("mutations_created: 0");
    expect(source).toContain("db_writes: 0");
    expect(source).toContain("provider_called: false");
    expect(source).toContain("external_live_fetch: false");
    expect(source).toContain("fake_green_claimed: false");
    expect(source).toContain("secrets_printed: false");
    expect(source).toContain("raw_rows_printed: false");
    expect(source).not.toMatch(/service_role|listUsers|createClient\(|\.from\(|insert\(|update\(|delete\(/);
  });

  it("emits only this wave's exact statuses", () => {
    expect(source).toContain("GREEN_AI_ALL_SCREEN_BUTTON_ROLE_ACTION_MAP_READY");
    expect(source).toContain("BLOCKED_SCREEN_BUTTON_AUDIT_INCOMPLETE");
    expect(source).toContain("BLOCKED_SCREEN_BUTTON_AUDIT_RUNTIME_TARGETABILITY");
    expect(source).toContain("BLOCKED_ANDROID_RUNTIME_NOT_AVAILABLE");
    expect(source).not.toContain("BLOCKED_LEDGER_RPC_NOT_DEPLOYED");
    expect(source).not.toContain("BLOCKED_POSTGREST_SCHEMA_CACHE_STALE");
    expect(source).not.toContain("BLOCKED_IOS_BUILD_SIGNOFF_REQUIRED");
    expect(source).not.toContain("BLOCKED_ANDROID_MAESTRO_DRIVER_UNAVAILABLE");
  });
});
