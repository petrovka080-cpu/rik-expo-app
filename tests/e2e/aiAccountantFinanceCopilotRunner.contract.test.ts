import fs from "node:fs";
import path from "node:path";

describe("AI accountant finance copilot runner contract", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "scripts/e2e/runAiAccountantFinanceCopilotMaestro.ts"),
    "utf8",
  );

  it("requires production-safe approval flags and writes redacted S_AI_MAGIC_07 artifacts", () => {
    expect(source).toContain("S_AI_MAGIC_WAVES_APPROVED");
    expect(source).toContain("S_AI_MAGIC_REQUIRE_ANDROID_EMULATOR_PROOF");
    expect(source).toContain("S_AI_NO_FAKE_GREEN");
    expect(source).toContain("S_AI_NO_SECRETS_PRINTING");
    expect(source).toContain('const wave = "S_AI_MAGIC_07_ACCOUNTANT_FINANCE_COPILOT"');
    expect(source).toContain('const inventoryPath = `${artifactPrefix}_inventory.json`');
    expect(source).toContain('const matrixPath = `${artifactPrefix}_matrix.json`');
    expect(source).toContain('const emulatorPath = `${artifactPrefix}_emulator.json`');
    expect(source).toContain('const proofPath = `${artifactPrefix}_proof.md`');
  });

  it("does not use service role, admin auth, fake finance rows, providers, or payment mutation", () => {
    expect(source).not.toMatch(/SUPABASE_SERVICE_ROLE|serviceRoleKey|service_role_key/i);
    expect(source).not.toMatch(/auth\.admin|listUsers|seed_used:\s*true|fake row/i);
    expect(source).not.toMatch(/from\s+["'][^"']*(openai|AiModelGateway|assistantClient)[^"']*["']|gpt-|openai_api_key/i);
    expect(source).not.toMatch(/payment_created:\s*true|posting_created:\s*true|invoice_mutated:\s*true/i);
    expect(source).toContain("verifyAndroidInstalledBuildRuntime");
    expect(source).toContain("callBffReadonlyMobile");
  });
});
