import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import {
  buildDirectorProposalRiskSummaryPrompt,
  generateDirectorProposalRiskSummary,
  sanitizeDirectorProposalRiskSummaryContext,
  type DirectorProposalRiskSummaryProvider,
} from "../../src/shared/ai/directorProposalRiskSummary";
import { readAiWorkflowFlags } from "../../src/shared/ai/aiWorkflowFlags";

const root = path.resolve(__dirname, "../..");

const read = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

const changedFiles = () =>
  execSync("git diff --name-only HEAD", { cwd: root, encoding: "utf8" })
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

const sLoadFix6WarehouseIssueExplainPatch =
  "supabase/migrations/20260430143000_s_load_fix_6_warehouse_issue_queue_explain_index_patch.sql";
const aiActionLedgerReadinessMigration =
  "supabase/migrations/20260513100000_ai_action_ledger_audit_rls_contract.sql";
const aiActionLedgerApplyMigration =
  "supabase/migrations/20260513230000_ai_action_ledger_apply.sql";

const isApprovedSLoadFix6WarehouseIssuePatch = (file: string) =>
  [sLoadFix6WarehouseIssueExplainPatch, aiActionLedgerReadinessMigration, aiActionLedgerApplyMigration].includes(
    file.replace(/\\/g, "/"),
  );

const unsafeContext = {
  proposalId: "proposal-person@example.test",
  status: "pending",
  totalSum: 1200,
  attachmentsCount: 1,
  integritySummary: "call +1 555 123 4567 before review",
  items: [
    {
      id: "line-1",
      name: "Concrete delivery to 123 Main Street",
      supplier: "supplier@example.test",
      qty: 2,
      uom: "m3",
      price: 600,
      appCode: "MAT-1",
    },
  ],
};

describe("S-AI-WORKFLOW-2 director risk summary safety", () => {
  it("keeps feature and external AI calls disabled by default", () => {
    expect(readAiWorkflowFlags({})).toEqual({
      directorProposalRiskSummaryEnabled: false,
      externalAiCallsEnabled: false,
    });
  });

  it("does not call AI provider when the feature is disabled", async () => {
    const provider = jest.fn(async () => ({
      summary: "ok",
      riskFlags: [],
      suggestedChecks: [],
      confidenceLabel: "low",
      limitations: [],
      safeDisplayText: "ok",
      advisoryOnly: true,
      canMutateState: false,
    }));

    const result = await generateDirectorProposalRiskSummary({
      context: unsafeContext,
      provider,
      flags: {
        directorProposalRiskSummaryEnabled: false,
        externalAiCallsEnabled: false,
      },
      allowMockProvider: true,
    });

    expect(result.ok).toBe(false);
    expect(provider).not.toHaveBeenCalled();
  });

  it("sanitizes proposal context and prompt before provider invocation", async () => {
    const provider: jest.MockedFunction<DirectorProposalRiskSummaryProvider> = jest.fn(async (_request) => ({
      summary: "Review price variance before decision.",
      riskFlags: ["High total vs small item count"],
      suggestedChecks: ["Compare supplier quote against proposal attachment"],
      confidenceLabel: "medium",
      limitations: ["Advisory only"],
      safeDisplayText: "Review price variance before decision.",
      advisoryOnly: true,
      canMutateState: false,
    }));

    const result = await generateDirectorProposalRiskSummary({
      context: unsafeContext,
      provider,
      flags: {
        directorProposalRiskSummaryEnabled: true,
        externalAiCallsEnabled: false,
      },
      allowMockProvider: true,
    });

    expect(result.ok).toBe(true);
    expect(provider).toHaveBeenCalledTimes(1);
    const request = provider.mock.calls[0]![0];
    expect(JSON.stringify(request)).not.toContain("person@example.test");
    expect(JSON.stringify(request)).not.toContain("supplier@example.test");
    expect(JSON.stringify(request)).not.toContain("+1 555 123 4567");
    expect(JSON.stringify(request)).not.toContain("123 Main Street");
    expect(request.prompt).toContain("[redacted]");
  });

  it("rejects invalid output and mutation intent fail-closed", async () => {
    const invalid = await generateDirectorProposalRiskSummary({
      context: unsafeContext,
      provider: jest.fn(async () => ({ summary: "" })),
      flags: {
        directorProposalRiskSummaryEnabled: true,
        externalAiCallsEnabled: false,
      },
      allowMockProvider: true,
    });

    expect(invalid.ok).toBe(false);
    if (!invalid.ok) expect(invalid.error.code).toBe("invalid_output");

    const mutating = await generateDirectorProposalRiskSummary({
      context: unsafeContext,
      provider: jest.fn(async () => ({
        summary: "Approve this proposal now.",
        riskFlags: [],
        suggestedChecks: [],
        confidenceLabel: "high",
        limitations: [],
        safeDisplayText: "Approve this proposal now.",
        advisoryOnly: true,
        canMutateState: false,
      })),
      flags: {
        directorProposalRiskSummaryEnabled: true,
        externalAiCallsEnabled: false,
      },
      allowMockProvider: true,
    });

    expect(mutating.ok).toBe(false);
    if (!mutating.ok) expect(mutating.error.code).toBe("mutation_intent_blocked");
  });

  it("builds advisory-only safe output without raw prompt or response logging", () => {
    const context = sanitizeDirectorProposalRiskSummaryContext(unsafeContext);
    const prompt = buildDirectorProposalRiskSummaryPrompt(context);
    const adapterSource = read("src/shared/ai/directorProposalRiskSummary.ts");
    const cardSource = read("src/components/director/DirectorProposalRiskSummaryCard.tsx");

    expect(prompt).toContain("advisory-only");
    expect(prompt).toContain("Do not approve, reject, submit, pay, receive, mutate");
    expect(adapterSource).not.toContain("console.");
    expect(cardSource).not.toContain("console.");
    expect(cardSource).not.toContain("director-proposal-approve");
    expect(cardSource).not.toContain("director-proposal-reject");
    expect(cardSource).not.toContain("raw");
  });

  it("keeps forbidden file classes untouched and artifacts valid JSON", () => {
    const changed = changedFiles().filter((file) => !isApprovedSLoadFix6WarehouseIssuePatch(file));
    expect(changed.some((file) => file.startsWith("supabase/migrations/"))).toBe(false);
    expect(changed.some((file) => file.startsWith("ios/"))).toBe(false);
    expect(changed.some((file) => file.startsWith("android/"))).toBe(false);
    expect(changed).not.toEqual(expect.arrayContaining(["package.json", "package-lock.json", "app.json", "eas.json"]));

    const matrix = JSON.parse(read("artifacts/S_AI_WORKFLOW_2_director_risk_summary_matrix.json"));
    expect(matrix.wave).toBe("S-AI-WORKFLOW-2");
    expect(matrix.pilot.enabledByDefault).toBe(false);
    expect(matrix.pilot.autoCallsAiOnRender).toBe(false);
    expect(matrix.safety.sqlRpcChanged).toBe(false);
    expect(matrix.safety.packageNativeChanged).toBe(false);
    expect(matrix.safety.productionTouched).toBe(false);
  });
});
