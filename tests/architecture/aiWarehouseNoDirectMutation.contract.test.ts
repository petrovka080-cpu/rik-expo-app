import fs from "node:fs";
import path from "node:path";

describe("AI warehouse operations copilot architecture", () => {
  const projectRoot = process.cwd();
  const files = [
    "src/features/ai/warehouse/aiWarehouseEvidenceResolver.ts",
    "src/features/ai/warehouse/aiWarehouseRiskClassifier.ts",
    "src/features/ai/warehouse/aiWarehouseDraftActionPlanner.ts",
    "src/features/ai/warehouse/aiWarehouseApprovalCandidate.ts",
  ];
  const source = files.map((file) => fs.readFileSync(path.join(projectRoot, file), "utf8")).join("\n");

  it("keeps warehouse AI source free of direct DB writes, providers, and final stock mutation", () => {
    expect(source).toContain("directStockMutationAllowed: false");
    expect(source).toContain("finalIssueAllowed: false");
    expect(source).toContain("finalReceiveAllowed: false");
    expect(source).toContain("mutationCount: 0");
    expect(source).toContain("routeAiApprovalRequiredAction");

    expect(source).not.toMatch(/@supabase\/supabase-js|\bsupabase\b|\bauth\.admin\b|\blistUsers\b|\bservice_role\b/i);
    expect(source).not.toMatch(/\.(?:from|rpc|insert|update|delete|upsert)\s*\(/);
    expect(source).not.toMatch(/\bfetch\s*\(|openai|gpt-|gemini|AiModelGateway|assistantClient/i);
    expect(source).not.toMatch(/stockMutated:\s*true|reservationCreated:\s*true|movementCreated:\s*true/i);
    expect(source).not.toMatch(/directStockMutationAllowed:\s*true|finalIssueAllowed:\s*true|finalReceiveAllowed:\s*true/i);
  });
});
