import fs from "fs";
import path from "path";

import { AI_PROCUREMENT_LIVE_SUPPLIER_CHAIN_CONTRACT } from "../../src/features/ai/procurement/aiProcurementLiveChain";

const projectRoot = process.cwd();

const sourceFiles = [
  "src/features/ai/procurement/aiProcurementLiveChain.ts",
  "src/features/ai/procurement/aiSupplierDecisionPolicy.ts",
  "src/features/ai/procurement/aiProcurementEvidenceBuilder.ts",
  "src/features/ai/agent/agentBffRouteShell.ts",
  "scripts/e2e/runAiProcurementLiveSupplierChainMaestro.ts",
];

function read(relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

describe("AI procurement live supplier chain architecture", () => {
  it("keeps the live supplier chain internal-first and non-mutating", () => {
    expect(AI_PROCUREMENT_LIVE_SUPPLIER_CHAIN_CONTRACT).toMatchObject({
      internalFirstRequired: true,
      marketplaceSecondRequired: true,
      draftRequestRequired: true,
      submitForApprovalBoundaryRequired: true,
      externalLiveFetch: false,
      supplierConfirmationAllowed: false,
      orderCreationAllowed: false,
      warehouseMutationAllowed: false,
      paymentCreationAllowed: false,
      mutationCount: 0,
      fakeSuppliersAllowed: false,
    });
  });

  it("mounts live supplier chain BFF routes without database or provider access", () => {
    const shell = read("src/features/ai/agent/agentBffRouteShell.ts");
    expect(shell).toContain("POST /agent/procurement/live-supplier-chain/preview");
    expect(shell).toContain("POST /agent/procurement/live-supplier-chain/draft");
    expect(shell).toContain("POST /agent/procurement/live-supplier-chain/submit-for-approval");
    expect(shell).toContain("agent.procurement.live_supplier_chain.preview");
    expect(shell).toContain("agent.procurement.live_supplier_chain.draft");
    expect(shell).toContain("agent.procurement.live_supplier_chain.submit_for_approval");
    expect(shell).toContain("internal_context_marketplace_compare_draft_approval");
    expect(shell).toContain("mutates: false");
    expect(shell).toContain("callsModelProvider: false");
    expect(shell).toContain("callsDatabaseDirectly: false");
  });

  it("uses existing procurement copilot runtime proof and exact no-request blocker", () => {
    const runner = read("scripts/e2e/runAiProcurementLiveSupplierChainMaestro.ts");
    expect(runner).toContain("S_AI_MAGIC_16_PROCUREMENT_LIVE_SUPPLIER_CHAIN");
    expect(runner).toContain("resolveAiProcurementRuntimeRequest");
    expect(runner).toContain("runAiProcurementCopilotMaestro");
    expect(runner).toContain("verifyAndroidInstalledBuildRuntime");
    expect(runner).toContain("BLOCKED_REAL_PROCUREMENT_REQUEST_NOT_AVAILABLE");
    expect(runner).toContain("supplier_confirmed: false");
    expect(runner).toContain("order_created: false");
    expect(runner).toContain("warehouse_mutated: false");
    expect(runner).toContain("payment_created: false");
  });

  it("does not introduce UI hooks, direct database writes, provider calls, or fake suppliers", () => {
    const combined = sourceFiles.map(read).join("\n");
    expect(combined).not.toMatch(/useProcurementLive|useEffect|useMemo|useState/);
    expect(combined).not.toMatch(/@supabase\/supabase-js|\bsupabase\b|\bauth\.admin\b|\blistUsers\b/i);
    expect(combined).not.toMatch(/\.(?:from|rpc|insert|update|delete|upsert)\s*\(/);
    expect(combined).not.toMatch(/\bfetch\s*\(|\bXMLHttpRequest\b/);
    expect(combined).not.toMatch(/openai|gpt-|LegacyGeminiModelProvider|GeminiModelProvider|assistantClient/i);
    expect(combined).not.toMatch(/fake supplier|fake request|hardcoded response/i);
  });
});
