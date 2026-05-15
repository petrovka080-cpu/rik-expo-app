import fs from "node:fs";
import path from "node:path";

describe("AI warehouse operations copilot runner contract", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "scripts/e2e/runAiWarehouseOperationsCopilotMaestro.ts"),
    "utf8",
  );

  it("writes redacted S_AI_WAREHOUSE_01 artifacts and carries exact green/blocker statuses", () => {
    expect(source).toContain('const wave = "S_AI_WAREHOUSE_01_OPERATIONS_COPILOT"');
    expect(source).toContain("GREEN_AI_WAREHOUSE_OPERATIONS_COPILOT_READY");
    expect(source).toContain("BLOCKED_AI_WAREHOUSE_EVIDENCE_ROUTE_MISSING");
    expect(source).toContain("BLOCKED_AI_WAREHOUSE_APPROVAL_ROUTE_MISSING");
    expect(source).toContain("BLOCKED_AI_WAREHOUSE_RUNTIME_TARGETABILITY");
    expect(source).toContain('const inventoryPath = `${artifactPrefix}_inventory.json`');
    expect(source).toContain('const matrixPath = `${artifactPrefix}_matrix.json`');
    expect(source).toContain('const emulatorPath = `${artifactPrefix}_emulator.json`');
    expect(source).toContain('const proofPath = `${artifactPrefix}_proof.md`');
  });

  it("does not use service role, admin auth, fake warehouse rows, providers, or stock mutation", () => {
    expect(source).not.toMatch(/SUPABASE_SERVICE_ROLE|serviceRoleKey|service_role_key/i);
    expect(source).not.toMatch(/auth\.admin|listUsers|seed_used:\s*true|fake row/i);
    expect(source).not.toMatch(/from\s+["'][^"']*(openai|AiModelGateway|assistantClient)[^"']*["']|gpt-|openai_api_key/i);
    expect(source).not.toMatch(/stock_mutated:\s*true|reservation_created:\s*true|movement_created:\s*true/i);
    expect(source).not.toMatch(/final_issue_allowed:\s*true|final_receive_allowed:\s*true|direct_stock_mutation_allowed:\s*true/i);
    expect(source).toContain("verifyAndroidInstalledBuildRuntime");
    expect(source).toContain("callBffReadonlyMobile");
    expect(source).toContain("resolveAiWarehouseEvidence");
    expect(source).toContain("classifyAiWarehouseStockMovementRisk");
    expect(source).toContain("planAiWarehouseDraftActions");
    expect(source).toContain("buildAiWarehouseApprovalCandidate");
  });
});
