import fs from "node:fs";
import path from "node:path";

describe("AI accountant finance copilot architecture", () => {
  const projectRoot = process.cwd();
  const files = [
    "src/features/ai/finance/aiFinanceEvidenceResolver.ts",
    "src/features/ai/finance/aiPaymentRiskClassifier.ts",
    "src/features/ai/finance/aiPaymentDraftRationale.ts",
    "src/features/ai/finance/aiFinanceApprovalCandidate.ts",
  ];
  const source = files.map((file) => fs.readFileSync(path.join(projectRoot, file), "utf8")).join("\n");

  it("keeps finance AI source free of direct DB writes, providers, payments, and postings", () => {
    expect(source).toContain("directPaymentAllowed: false");
    expect(source).toContain("directFinancePostingAllowed: false");
    expect(source).toContain("ledgerBypassAllowed: false");
    expect(source).toContain("mutationCount: 0");
    expect(source).toContain("routeAiApprovalRequiredAction");

    expect(source).not.toMatch(/@supabase\/supabase-js|\bsupabase\b|\bauth\.admin\b|\blistUsers\b|\bservice_role\b/i);
    expect(source).not.toMatch(/\.(?:from|rpc|insert|update|delete|upsert)\s*\(/);
    expect(source).not.toMatch(/\bfetch\s*\(|openai|gpt-|gemini|AiModelGateway|assistantClient/i);
    expect(source).not.toMatch(/paymentCreated:\s*true|postingCreated:\s*true|invoiceMutated:\s*true/i);
    expect(source).not.toMatch(/directPaymentAllowed:\s*true|directFinancePostingAllowed:\s*true|ledgerBypassAllowed:\s*true/i);
  });
});
