import fs from "fs";
import path from "path";

import { AI_ROLE_COPILOT_RUNTIME_CONTRACT } from "../../src/features/ai/roles/aiRoleCopilotRuntime";

const projectRoot = process.cwd();

const sourceFiles = [
  "src/features/ai/roles/aiRoleCopilotProfiles.ts",
  "src/features/ai/roles/aiRoleCopilotPolicy.ts",
  "src/features/ai/roles/aiRoleCopilotRuntime.ts",
  "scripts/e2e/runAiRoleCopilotRuntimePackMaestro.ts",
];

function read(relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

describe("AI role copilot runtime pack architecture", () => {
  it("keeps role copilot runtime backend-first, non-mutating, and provider-neutral", () => {
    expect(AI_ROLE_COPILOT_RUNTIME_CONTRACT).toMatchObject({
      backendFirst: true,
      roleScoped: true,
      developerControlSingleAccountSupported: true,
      roleIsolationE2eClaimed: false,
      roleIsolationContractProof: true,
      mutationCount: 0,
      dbWrites: 0,
      externalLiveFetch: false,
      providerCalled: false,
      fakeRoleIsolation: false,
      fakeAiAnswer: false,
      hardcodedAiResponse: false,
    });
  });

  it("declares the required production role profiles without claiming runtime role isolation", () => {
    const profiles = read("src/features/ai/roles/aiRoleCopilotProfiles.ts");
    for (const role of [
      "director",
      "control",
      "buyer",
      "foreman",
      "accountant",
      "warehouse",
      "contractor",
    ]) {
      expect(profiles).toContain(`role: "${role}"`);
    }
    expect(profiles).toContain("own_records_only");
    expect(profiles).toContain("roleIsolationE2eClaimed: false");
    expect(profiles).not.toContain("roleIsolationE2eClaimed: true");
  });

  it("guards Wave 15 behind roadmap approvals and reuses existing runtime proof", () => {
    const runner = read("scripts/e2e/runAiRoleCopilotRuntimePackMaestro.ts");
    expect(runner).toContain("S_AI_MAGIC_15_ROLE_COPILOT_RUNTIME_PACK");
    expect(runner).toContain("S_AI_MAGIC_ROADMAP_APPROVED");
    expect(runner).toContain("S_AI_MAGIC_REQUIRE_ANDROID_EMULATOR_PROOF");
    expect(runner).toContain("S_AI_DEVELOPER_CONTROL_FULL_ACCESS_APPROVED");
    expect(runner).toContain("S_AI_SINGLE_OWNER_ACCOUNT_MODE_APPROVED");
    expect(runner).toContain("verifyAndroidInstalledBuildRuntime");
    expect(runner).toContain("runDeveloperControlFullAccessMaestro");
    expect(runner).toContain("role_isolation_e2e_claimed: false");
    expect(runner).toContain("mutation_count: 0");
    expect(runner).toContain("db_writes: 0");
    expect(runner).toContain("external_live_fetch: false");
    expect(runner).toContain("model_provider_changed: false");
    expect(runner).toContain("gpt_enabled: false");
    expect(runner).toContain("gemini_removed: false");
  });

  it("does not introduce hooks, direct database access, provider calls, or fake role users", () => {
    const combined = sourceFiles.map(read).join("\n");
    expect(combined).not.toMatch(/useAiRoleCopilot|useRoleCopilot|useEffect|useMemo|useState/);
    expect(combined).not.toMatch(/@supabase\/supabase-js|\bsupabase\b|\bauth\.admin\b|\blistUsers\b/i);
    expect(combined).not.toMatch(/\.(?:from|rpc|insert|update|delete|upsert)\s*\(/);
    expect(combined).not.toMatch(/\bfetch\s*\(|\bXMLHttpRequest\b/);
    expect(combined).not.toMatch(/openai|gpt-|LegacyGeminiModelProvider|GeminiModelProvider|assistantClient/i);
    expect(combined).not.toMatch(/fake user|fake role|seed user|hardcoded response/i);
  });
});
