import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("AI director executive control center architecture", () => {
  const sourceFiles = [
    "src/features/ai/director/aiDirectorCrossDomainEvidence.ts",
    "src/features/ai/director/aiDirectorRiskPriorityScoring.ts",
    "src/features/ai/director/aiDirectorApprovalCandidate.ts",
    "src/features/ai/director/aiDirectorNextActionSelector.ts",
    "scripts/e2e/runAiDirectorExecutiveControlCenterMaestro.ts",
  ];
  const combined = sourceFiles.map(read).join("\n");

  it("uses the audit registry and approval router instead of direct execution", () => {
    expect(combined).toContain("listAiScreenButtonRoleActionEntries");
    expect(combined).toContain("routeAiApprovalRequiredAction");
    expect(combined).toContain("executeOnlyAfterApprovedStatus");
    expect(combined).toContain("directExecuteAllowed: false");
    expect(combined).not.toMatch(/directExecuteAllowed:\s*true|directMutationAllowed:\s*true/i);
    expect(combined).not.toMatch(/executeApprovedActionLedgerBff|executeApprovedApprovalInboxActionBff/i);
    expect(combined).not.toMatch(/approveActionLedgerBff|rejectActionLedgerBff/i);
  });

  it("does not mutate procurement, warehouse, finance, or field closeout directly", () => {
    expect(combined).toContain("procurementMutationAllowed: false");
    expect(combined).toContain("warehouseMutationAllowed: false");
    expect(combined).toContain("financeMutationAllowed: false");
    expect(combined).toContain("fieldFinalSubmitAllowed: false");
    expect(combined).not.toMatch(/procurementMutationAllowed:\s*true/i);
    expect(combined).not.toMatch(/warehouseMutationAllowed:\s*true/i);
    expect(combined).not.toMatch(/financeMutationAllowed:\s*true/i);
    expect(combined).not.toMatch(/fieldFinalSubmitAllowed:\s*true/i);
    expect(combined).not.toMatch(/paymentCreated:\s*true|postingCreated:\s*true|stockMutated:\s*true/i);
    expect(combined).not.toMatch(/orderCreated:\s*true|supplierConfirmed:\s*true|reportPublished:\s*true/i);
  });

  it("does not add DB writes, provider calls, admin auth, service role, or fake green", () => {
    expect(combined).not.toMatch(/\bcreateClient\(|\bsupabase\.from\(|\bclient\.from\(|\.insert\(|\.update\(|\.delete\(|\brpc\(/i);
    expect(combined).not.toMatch(/auth\.admin|listUsers|service_role(?!_used)|SUPABASE_SERVICE_ROLE_KEY/i);
    expect(combined).not.toMatch(/from\s+["'][^"']*(openai|AiModelGateway|assistantClient)[^"']*["']|gpt-|openai_api_key/i);
    expect(combined).not.toMatch(/providerCalled:\s*true|dbWrites:\s*[1-9]|mutationCount:\s*[1-9]/i);
    expect(combined).not.toMatch(/fakeNextActions:\s*true|fake_green_claimed:\s*true/i);
  });
});
