import { getAiToolDefinition } from "../../src/features/ai/tools/aiToolRegistry";
import { planAiToolUse } from "../../src/features/ai/tools/aiToolPlanPolicy";
import {
  DRAFT_REQUEST_MAX_ITEMS,
  runDraftRequestToolDraftOnly,
} from "../../src/features/ai/tools/draftRequestTool";

describe("draft_request no-final-submit contract", () => {
  it("registers draft_request as procurement DRAFT_ONLY for allowed planning roles only", () => {
    const tool = getAiToolDefinition("draft_request");

    expect(tool).toMatchObject({
      name: "draft_request",
      domain: "procurement",
      riskLevel: "draft_only",
      requiredRoles: ["director", "control", "foreman", "buyer", "warehouse"],
      approvalRequired: false,
      idempotencyRequired: false,
      evidenceRequired: true,
    });
    for (const deniedRole of ["accountant", "contractor", "office", "admin", "unknown"]) {
      expect(tool?.requiredRoles).not.toContain(deniedRole);
    }
  });

  it("allows only draft roles and keeps the plan non-mutating", () => {
    for (const role of ["director", "control", "foreman", "buyer", "warehouse"] as const) {
      expect(planAiToolUse({ toolName: "draft_request", role })).toMatchObject({
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

    for (const role of ["accountant", "contractor", "office", "admin", "unknown"] as const) {
      expect(planAiToolUse({ toolName: "draft_request", role })).toMatchObject({
        allowed: false,
        mode: "blocked",
      });
    }
  });

  it("reports missing fields and still stays draft-only without final submit or persistence", async () => {
    const result = await runDraftRequestToolDraftOnly({
      auth: { userId: "foreman-user", role: "foreman" },
      input: {
        project_id: " ",
        items: [
          {
            name: "Concrete",
            quantity: 0,
            unit: "",
          },
        ],
      },
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        missing_fields: ["project_id", "items[0].quantity", "items[0].unit"],
        risk_flags: ["missing_required_fields", "delivery_window_missing"],
        requires_approval: true,
        next_action: "submit_for_approval",
        persisted: false,
        idempotency_required_if_persisted: true,
        mutation_count: 0,
        final_submit: 0,
        supplier_confirmation: 0,
        order_created: 0,
        warehouse_mutation: 0,
      },
    });
  });

  it("bounds item normalization and preserves redacted evidence references", async () => {
    const items = Array.from({ length: DRAFT_REQUEST_MAX_ITEMS + 3 }, (_, index) => ({
      name: `Material ${index + 1}`,
      quantity: index + 1,
      unit: "pcs",
    }));

    const result = await runDraftRequestToolDraftOnly({
      auth: { userId: "warehouse-user", role: "warehouse" },
      input: {
        project_id: "project-warehouse",
        delivery_window: "2026-05",
        items,
      },
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        risk_flags: ["items_truncated_to_safe_limit"],
        requires_approval: true,
        final_submit: 0,
        order_created: 0,
        warehouse_mutation: 0,
      },
    });
    if (!result.ok) throw new Error("expected draft_request success");
    expect(result.data.items_normalized).toHaveLength(DRAFT_REQUEST_MAX_ITEMS);
    expect(result.data.evidence_refs).toHaveLength(DRAFT_REQUEST_MAX_ITEMS + 1);
    expect(result.data.evidence_refs.every((ref) => ref.startsWith("draft_request:input:"))).toBe(true);
  });
});
