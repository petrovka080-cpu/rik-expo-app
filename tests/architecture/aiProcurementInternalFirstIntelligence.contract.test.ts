import fs from "fs";
import path from "path";

const projectRoot = process.cwd();

const sourceFiles = [
  "src/features/ai/procurement/aiProcurementRequestUnderstanding.ts",
  "src/features/ai/procurement/aiInternalSupplierRanker.ts",
  "src/features/ai/procurement/aiProcurementRiskSignals.ts",
  "src/features/ai/procurement/aiProcurementDecisionCard.ts",
  "src/features/ai/agent/agentBffRouteShell.ts",
  "scripts/e2e/runAiProcurementInternalFirstMaestro.ts",
];

function read(relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

describe("AI procurement internal-first intelligence architecture", () => {
  it("mounts the Wave 04 BFF routes without provider, database, or mutation access", () => {
    const shell = read("src/features/ai/agent/agentBffRouteShell.ts");

    expect(shell).toContain("GET /agent/procurement/request-understanding/:requestId");
    expect(shell).toContain("POST /agent/procurement/internal-supplier-rank");
    expect(shell).toContain("POST /agent/procurement/decision-card");
    expect(shell).toContain("POST /agent/procurement/draft-request-preview");
    expect(shell).toContain("agent.procurement.request_understanding.read");
    expect(shell).toContain("agent.procurement.internal_supplier_rank.preview");
    expect(shell).toContain("agent.procurement.decision_card.preview");
    expect(shell).toContain("agent.procurement.draft_request.internal_first_preview");
    expect(shell).toContain("mutates: false");
    expect(shell).toContain("callsModelProvider: false");
    expect(shell).toContain("callsDatabaseDirectly: false");
  });

  it("keeps intelligence internal-first, approval-gated, and side-effect-free", () => {
    const combined = sourceFiles.map(read).join("\n");

    expect(combined).toContain("internal_first: true");
    expect(combined).toContain("external_fetch: false");
    expect(combined).toContain("supplier_confirmed: false");
    expect(combined).toContain("order_created: false");
    expect(combined).toContain("warehouse_mutated: false");
    expect(combined).toContain("payment_created: false");
    expect(combined).toContain("mutationCount: 0");
    expect(combined).toContain("BLOCKED_REAL_PROCUREMENT_REQUEST_NOT_AVAILABLE");
    expect(combined).not.toMatch(/useEffect|useMemo|useState|useCallback|useReducer/);
    expect(combined).not.toMatch(/@supabase\/supabase-js|\bsupabase\b|\bauth\.admin\b|\blistUsers\b|\bservice_role\b/i);
    expect(combined).not.toMatch(/\.(?:from|rpc|insert|update|delete|upsert)\s*\(/);
    expect(combined).not.toMatch(/\bfetch\s*\(|\bXMLHttpRequest\b/);
    expect(combined).not.toMatch(/openai|gpt-|LegacyGeminiModelProvider|GeminiModelProvider|assistantClient/i);
    expect(combined).not.toMatch(/hardcoded AI response|hardcoded supplier|fake supplier card/i);
  });
});
