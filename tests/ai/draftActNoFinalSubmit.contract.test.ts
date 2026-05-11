import { getAiToolDefinition } from "../../src/features/ai/tools/aiToolRegistry";
import { planAiToolUse } from "../../src/features/ai/tools/aiToolPlanPolicy";
import {
  DRAFT_ACT_MAX_EVIDENCE_REFS,
  DRAFT_ACT_MAX_WORK_ITEMS,
  runDraftActToolDraftOnly,
} from "../../src/features/ai/tools/draftActTool";

describe("draft_act no-final-submit contract", () => {
  it("registers draft_act as subcontracts DRAFT_ONLY for scoped act roles only", () => {
    const tool = getAiToolDefinition("draft_act");

    expect(tool).toMatchObject({
      name: "draft_act",
      domain: "subcontracts",
      riskLevel: "draft_only",
      requiredRoles: ["director", "control", "foreman", "contractor"],
      approvalRequired: false,
      idempotencyRequired: false,
      evidenceRequired: true,
      auditEvent: "ai.action.draft_created",
    });
    for (const deniedRole of ["buyer", "accountant", "warehouse", "office", "admin", "unknown"]) {
      expect(tool?.requiredRoles).not.toContain(deniedRole);
    }
  });

  it("allows only subcontract draft roles and keeps the plan non-mutating", () => {
    for (const role of ["director", "control", "foreman", "contractor"] as const) {
      expect(planAiToolUse({ toolName: "draft_act", role })).toMatchObject({
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

    for (const role of ["buyer", "accountant", "warehouse", "office", "admin", "unknown"] as const) {
      expect(planAiToolUse({ toolName: "draft_act", role })).toMatchObject({
        allowed: false,
        mode: "blocked",
      });
    }
  });

  it("reports missing fields and still stays draft-only without signature or persistence", async () => {
    const result = await runDraftActToolDraftOnly({
      auth: { userId: "foreman-user", role: "foreman" },
      input: {
        subcontract_id: " ",
        act_kind: "missing",
        work_summary: "",
        work_items: [
          {
            name: "Concrete work",
            quantity: 0,
            unit: "",
          },
        ],
        source_evidence_refs: [],
      },
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        act_kind: "work_completion",
        missing_fields: [
          "subcontract_id",
          "act_kind",
          "work_summary",
          "source_evidence_refs",
          "work_items[0].quantity",
          "work_items[0].unit",
        ],
        risk_flags: ["missing_required_fields", "period_range_missing"],
        requires_approval: true,
        next_action: "submit_for_approval",
        role_scope: "foreman_subcontract_scope",
        role_scoped: true,
        persisted: false,
        idempotency_required_if_persisted: true,
        mutation_count: 0,
        final_submit: 0,
        act_signed: 0,
        contractor_confirmation: 0,
        payment_mutation: 0,
        warehouse_mutation: 0,
      },
    });
  });

  it("bounds work items and source evidence refs while preserving only redacted references", async () => {
    const workItems = Array.from({ length: DRAFT_ACT_MAX_WORK_ITEMS + 4 }, (_, index) => ({
      name: `Work ${index + 1}`,
      quantity: index + 1,
      unit: "m2",
    }));
    const refs = Array.from(
      { length: DRAFT_ACT_MAX_EVIDENCE_REFS + 3 },
      (_, index) => `subcontract:evidence:${index + 1}`,
    );

    const result = await runDraftActToolDraftOnly({
      auth: { userId: "director-user", role: "director" },
      input: {
        subcontract_id: "subcontract-1",
        act_kind: "subcontract_progress",
        work_summary: "progress ready for act review",
        period_start: "2026-05-01",
        period_end: "2026-05-12",
        work_items: workItems,
        source_evidence_refs: refs,
      },
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        act_kind: "subcontract_progress",
        risk_flags: [
          "source_evidence_truncated_to_safe_limit",
          "work_items_truncated_to_safe_limit",
        ],
        final_submit: 0,
        act_signed: 0,
        payment_mutation: 0,
        warehouse_mutation: 0,
      },
    });
    if (!result.ok) throw new Error("expected draft_act success");
    expect(result.data.work_items_normalized).toHaveLength(DRAFT_ACT_MAX_WORK_ITEMS);
    expect(result.data.evidence_refs).toHaveLength(
      1 + DRAFT_ACT_MAX_EVIDENCE_REFS + DRAFT_ACT_MAX_WORK_ITEMS,
    );
    expect(result.data.evidence_refs).toContain("draft_act:input:subcontract");
    expect(result.data.evidence_refs).toContain("draft_act:input:work_item:1");
    expect(result.data.evidence_refs).not.toContain(`subcontract:evidence:${DRAFT_ACT_MAX_EVIDENCE_REFS + 1}`);
  });
});
