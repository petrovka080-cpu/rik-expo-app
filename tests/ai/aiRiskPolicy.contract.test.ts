import {
  assertAiActionAllowed,
  getAiRiskLevel,
  requiresAiApproval,
} from "../../src/features/ai/policy/aiRiskPolicy";

describe("AI risk policy", () => {
  it("classifies safe, draft, approval-required, and forbidden actions", () => {
    expect(getAiRiskLevel("search_catalog")).toBe("safe_read");
    expect(getAiRiskLevel("compare_suppliers")).toBe("safe_read");
    expect(getAiRiskLevel("draft_request")).toBe("draft_only");
    expect(getAiRiskLevel("draft_report")).toBe("draft_only");
    expect(getAiRiskLevel("submit_request")).toBe("approval_required");
    expect(getAiRiskLevel("confirm_supplier")).toBe("approval_required");
    expect(getAiRiskLevel("change_warehouse_status")).toBe("approval_required");
    expect(getAiRiskLevel("send_document")).toBe("approval_required");
    expect(getAiRiskLevel("change_payment_status")).toBe("approval_required");
    expect(getAiRiskLevel("direct_supabase_query")).toBe("forbidden");
    expect(getAiRiskLevel("raw_db_export")).toBe("forbidden");
    expect(getAiRiskLevel("delete_data")).toBe("forbidden");
    expect(requiresAiApproval("create_order")).toBe(true);
  });

  it("allows approval submission without allowing forbidden actions", () => {
    expect(assertAiActionAllowed({
      actionType: "submit_request",
      role: "foreman",
      domain: "procurement",
    })).toMatchObject({
      allowed: true,
      requiresApproval: true,
      redactionRequired: true,
      auditRequired: true,
    });
    expect(assertAiActionAllowed({
      actionType: "direct_supabase_query",
      role: "director",
      domain: "control",
    })).toMatchObject({
      allowed: false,
      riskLevel: "forbidden",
      requiresApproval: false,
    });
  });
});
