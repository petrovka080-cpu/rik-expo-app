import fs from "node:fs";
import path from "node:path";

describe("AI director executive control center Maestro runner contract", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "scripts/e2e/runAiDirectorExecutiveControlCenterMaestro.ts"),
    "utf8",
  );

  it("writes redacted S_AI_DIRECTOR_01 artifacts and carries exact green/blocker statuses", () => {
    expect(source).toContain('const wave = "S_AI_DIRECTOR_01_EXECUTIVE_CONTROL_CENTER"');
    expect(source).toContain("GREEN_AI_DIRECTOR_EXECUTIVE_CONTROL_CENTER_READY");
    expect(source).toContain("BLOCKED_AI_DIRECTOR_EVIDENCE_ROUTE_MISSING");
    expect(source).toContain("BLOCKED_AI_DIRECTOR_APPROVAL_ROUTE_MISSING");
    expect(source).toContain("BLOCKED_AI_DIRECTOR_RUNTIME_TARGETABILITY");
    expect(source).toContain('const inventoryPath = `${artifactPrefix}_inventory.json`');
    expect(source).toContain('const matrixPath = `${artifactPrefix}_matrix.json`');
    expect(source).toContain('const emulatorPath = `${artifactPrefix}_emulator.json`');
    expect(source).toContain('const proofPath = `${artifactPrefix}_proof.md`');
  });

  it("uses director evidence, scoring, selector, approval candidates, and Android smoke", () => {
    expect(source).toContain("resolveAiDirectorCrossDomainEvidence");
    expect(source).toContain("scoreAiDirectorRiskPriority");
    expect(source).toContain("selectAiDirectorNextActions");
    expect(source).toContain("verifyAndroidInstalledBuildRuntime");
    expect(source).toContain("approval_candidate_ready");
    expect(source).toContain("no_direct_execute");
    expect(source).toContain("no_direct_finance_procurement_warehouse_mutation");
  });

  it("does not use service role, admin auth, providers, fake next actions, or direct mutations", () => {
    expect(source).not.toMatch(/auth\.admin|listUsers|service_role(?!_used)|SUPABASE_SERVICE_ROLE_KEY/i);
    expect(source).not.toMatch(/from\s+["'][^"']*(openai|AiModelGateway|assistantClient)[^"']*["']|gpt-|openai_api_key/i);
    expect(source).not.toMatch(/fake_next_actions:\s*true|fake_green_claimed:\s*true/i);
    expect(source).not.toMatch(/procurement_mutation_allowed:\s*true|warehouse_mutation_allowed:\s*true/i);
    expect(source).not.toMatch(/finance_mutation_allowed:\s*true|field_final_submit_allowed:\s*true/i);
    expect(source).not.toMatch(/final_execution:\s*[1-9]|mutation_count:\s*[1-9]|db_writes:\s*[1-9]/i);
  });
});
