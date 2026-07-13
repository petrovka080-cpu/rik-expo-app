import { buildForemanAiEstimateRolePermissionMatrix } from "../../src/lib/foremanAiEstimate/foremanAiEstimateRolePolicy";

describe("foreman AI estimate RBAC contract", () => {
  it("keeps role permissions separated", () => {
    const matrix = buildForemanAiEstimateRolePermissionMatrix();

    expect(matrix.foreman_can_create_ai_estimate).toBe(true);
    expect(matrix.foreman_can_save_draft).toBe(true);
    expect(matrix.foreman_can_submit_to_director).toBe(true);
    expect(matrix.foreman_can_director_approve).toBe(false);
    expect(matrix.foreman_can_create_procurement_directly).toBe(false);
    expect(matrix.director_can_view_submitted_estimate).toBe(true);
    expect(matrix.director_can_approve).toBe(true);
    expect(matrix.director_can_reject).toBe(true);
    expect(matrix.director_creates_buyer_rows_before_approval).toBe(false);
    expect(matrix.buyer_can_view_procurement_after_approval).toBe(true);
    expect(matrix.buyer_can_see_labor_rows).toBe(false);
    expect(matrix.buyer_can_see_quality_control_rows).toBe(false);
    expect(matrix.buyer_can_see_overhead_tax_rows).toBe(false);
    expect(matrix.buyer_can_see_drafts_before_approval).toBe(false);
    expect(matrix.b2c_consumer_can_write_foreman_draft).toBe(false);
  });
});
