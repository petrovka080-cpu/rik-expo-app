import fs from "node:fs";
import path from "node:path";

describe("AI finance accountant copilot maestro contract", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "scripts/e2e/runAiAccountantFinanceCopilotMaestro.ts"),
    "utf8",
  );

  it("writes redacted S_AI_FINANCE_01 artifacts and carries exact green/blocker statuses", () => {
    expect(source).toContain('const wave = "S_AI_FINANCE_01_ACCOUNTANT_COPILOT"');
    expect(source).toContain("GREEN_AI_FINANCE_ACCOUNTANT_COPILOT_READY");
    expect(source).toContain("BLOCKED_AI_FINANCE_EVIDENCE_ROUTE_MISSING");
    expect(source).toContain("BLOCKED_AI_FINANCE_APPROVAL_ROUTE_MISSING");
    expect(source).toContain("BLOCKED_AI_FINANCE_RUNTIME_TARGETABILITY");
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
    expect(source).not.toMatch(/direct_payment_allowed:\s*true|direct_finance_posting_allowed:\s*true|ledger_bypass_allowed:\s*true/i);
    expect(source).toContain("verifyAndroidInstalledBuildRuntime");
    expect(source).toContain("callBffReadonlyMobile");
    expect(source).toContain("resolveAiFinanceEvidence");
    expect(source).toContain("classifyAiPaymentRisk");
    expect(source).toContain("buildAiPaymentDraftRationale");
    expect(source).toContain("buildAiFinanceApprovalCandidate");
  });
});
