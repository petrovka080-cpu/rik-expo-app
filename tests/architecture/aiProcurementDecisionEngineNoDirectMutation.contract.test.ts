import fs from "fs";
import path from "path";

const projectRoot = process.cwd();

const sourceFiles = [
  "src/features/ai/procurement/aiProcurementDecisionEngine.ts",
  "src/features/ai/procurement/aiProcurementEvidenceCard.ts",
  "src/features/ai/procurement/aiProcurementApprovalCandidate.ts",
  "src/features/ai/procurement/aiProcurementInternalExternalBoundary.ts",
  "scripts/e2e/runAiProcurementDecisionEngineMaestro.ts",
] as const;

function read(relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

describe("AI procurement decision engine no-direct-mutation architecture", () => {
  it("keeps the decision engine provider-free, client-free, and approval-only", () => {
    const combined = sourceFiles.map(read).join("\n");

    expect(combined).toContain("internalFirst: true");
    expect(combined).toContain("externalFetch: false");
    expect(combined).toContain("supplierConfirmed: false");
    expect(combined).toContain("orderCreated: false");
    expect(combined).toContain("warehouseMutated: false");
    expect(combined).toContain("paymentCreated: false");
    expect(combined).toContain("mutationCount: 0");
    expect(combined).toContain("finalExecution: 0");
    expect(combined).toContain("routeAiApprovalRequiredAction");
    expect(combined).not.toMatch(/useEffect|useMemo|useState|useCallback|useReducer/);
    expect(combined).not.toMatch(/@supabase\/supabase-js|\bsupabase\b|\bauth\.admin\b|\blistUsers\b|\bservice_role\b/i);
    expect(combined).not.toMatch(/\.(?:from|rpc|insert|update|delete|upsert)\s*\(/);
    expect(combined).not.toMatch(/\bfetch\s*\(|\bXMLHttpRequest\b/);
    expect(combined).not.toMatch(/openai|gpt-|LegacyGeminiModelProvider|GeminiModelProvider|assistantClient/i);
    expect(combined).not.toMatch(/supplierConfirmed:\s*true|orderCreated:\s*true|warehouseMutated:\s*true|paymentCreated:\s*true/);
  });
});
