import { getAiToolDefinition } from "../../src/features/ai/tools/aiToolRegistry";
import { planAiToolUse } from "../../src/features/ai/tools/aiToolPlanPolicy";
import {
  DRAFT_REPORT_MAX_EVIDENCE_REFS,
  runDraftReportToolDraftOnly,
} from "../../src/features/ai/tools/draftReportTool";

describe("draft_report no-final-submit contract", () => {
  it("registers draft_report as reports DRAFT_ONLY with evidence and no direct approval bypass", () => {
    expect(getAiToolDefinition("draft_report")).toMatchObject({
      name: "draft_report",
      domain: "reports",
      riskLevel: "draft_only",
      approvalRequired: false,
      idempotencyRequired: false,
      evidenceRequired: true,
      auditEvent: "ai.action.draft_created",
    });
  });

  it("keeps visible roles inside non-mutating draft-only plans", () => {
    for (const role of [
      "director",
      "control",
      "foreman",
      "buyer",
      "accountant",
      "warehouse",
      "contractor",
      "office",
      "admin",
    ] as const) {
      expect(planAiToolUse({ toolName: "draft_report", role })).toMatchObject({
        allowed: true,
        mode: "draft_only_plan",
        riskLevel: "draft_only",
        capability: "draft",
        directExecutionEnabled: false,
        mutationAllowed: false,
        providerCallAllowed: false,
        dbAccessAllowed: false,
        rawRowsAllowed: false,
      });
    }

    expect(planAiToolUse({ toolName: "draft_report", role: "unknown" })).toMatchObject({
      allowed: false,
      mode: "blocked",
    });
  });

  it("reports missing fields and still stays draft-only without publication or persistence", async () => {
    const result = await runDraftReportToolDraftOnly({
      auth: { userId: "buyer-user", role: "buyer" },
      input: {
        object_id: "",
        report_kind: "missing",
        source_evidence_refs: [],
      },
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        report_kind: "daily",
        missing_fields: ["object_id", "report_kind", "source_evidence_refs"],
        risk_flags: ["missing_required_fields", "period_range_missing"],
        requires_approval: true,
        next_action: "submit_for_approval",
        persisted: false,
        idempotency_required_if_persisted: true,
        mutation_count: 0,
        final_submit: 0,
        report_published: 0,
        finance_mutation: 0,
        raw_finance_rows_exposed: false,
      },
    });
  });

  it("bounds source evidence refs and preserves only redacted references", async () => {
    const refs = Array.from(
      { length: DRAFT_REPORT_MAX_EVIDENCE_REFS + 4 },
      (_, index) => `report:evidence:${index + 1}`,
    );

    const result = await runDraftReportToolDraftOnly({
      auth: { userId: "director-user", role: "director" },
      input: {
        object_id: "object-1",
        report_kind: "progress",
        period_start: "2026-05-01",
        period_end: "2026-05-12",
        source_evidence_refs: refs,
      },
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        report_kind: "progress",
        risk_flags: ["source_evidence_truncated_to_safe_limit"],
        final_submit: 0,
        report_published: 0,
        finance_mutation: 0,
      },
    });
    if (!result.ok) throw new Error("expected draft_report success");
    expect(result.data.evidence_refs).toHaveLength(DRAFT_REPORT_MAX_EVIDENCE_REFS + 4);
    expect(result.data.evidence_refs).toContain("draft_report:input:object");
    expect(result.data.evidence_refs).toContain("draft_report:section:completed_work");
    expect(result.data.evidence_refs).not.toContain(`report:evidence:${DRAFT_REPORT_MAX_EVIDENCE_REFS + 1}`);
  });
});
