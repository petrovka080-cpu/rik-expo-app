export type ForemanAiEstimateRole = "foreman" | "director" | "buyer" | "consumer";

export type ForemanAiEstimateRoleAction =
  | "create_ai_estimate"
  | "save_foreman_draft"
  | "edit_own_foreman_draft"
  | "submit_to_director"
  | "view_submitted_estimate"
  | "approve_estimate"
  | "reject_estimate"
  | "view_procurement_rows_after_approval"
  | "view_labor_rows"
  | "view_quality_control_rows"
  | "view_overhead_tax_rows"
  | "view_drafts_before_approval"
  | "write_foreman_draft"
  | "write_b2c_history";

const ROLE_POLICY: Record<ForemanAiEstimateRole, ReadonlySet<ForemanAiEstimateRoleAction>> = {
  foreman: new Set([
    "create_ai_estimate",
    "save_foreman_draft",
    "edit_own_foreman_draft",
    "submit_to_director",
    "write_foreman_draft",
  ]),
  director: new Set([
    "view_submitted_estimate",
    "approve_estimate",
    "reject_estimate",
  ]),
  buyer: new Set([
    "view_procurement_rows_after_approval",
  ]),
  consumer: new Set([
    "write_b2c_history",
  ]),
};

export function canForemanAiEstimateRole(
  role: ForemanAiEstimateRole,
  action: ForemanAiEstimateRoleAction,
): boolean {
  return ROLE_POLICY[role]?.has(action) === true;
}

export function buildForemanAiEstimateRolePermissionMatrix() {
  return {
    foreman_can_create_ai_estimate: canForemanAiEstimateRole("foreman", "create_ai_estimate"),
    foreman_can_save_draft: canForemanAiEstimateRole("foreman", "save_foreman_draft"),
    foreman_can_submit_to_director: canForemanAiEstimateRole("foreman", "submit_to_director"),
    foreman_can_director_approve: canForemanAiEstimateRole("foreman", "approve_estimate"),
    foreman_can_create_procurement_directly: canForemanAiEstimateRole("foreman", "view_procurement_rows_after_approval"),
    director_can_view_submitted_estimate: canForemanAiEstimateRole("director", "view_submitted_estimate"),
    director_can_approve: canForemanAiEstimateRole("director", "approve_estimate"),
    director_can_reject: canForemanAiEstimateRole("director", "reject_estimate"),
    director_creates_buyer_rows_before_approval: canForemanAiEstimateRole("director", "view_procurement_rows_after_approval"),
    buyer_can_view_procurement_after_approval: canForemanAiEstimateRole("buyer", "view_procurement_rows_after_approval"),
    buyer_can_see_labor_rows: canForemanAiEstimateRole("buyer", "view_labor_rows"),
    buyer_can_see_quality_control_rows: canForemanAiEstimateRole("buyer", "view_quality_control_rows"),
    buyer_can_see_overhead_tax_rows: canForemanAiEstimateRole("buyer", "view_overhead_tax_rows"),
    buyer_can_see_drafts_before_approval: canForemanAiEstimateRole("buyer", "view_drafts_before_approval"),
    b2c_consumer_can_write_foreman_draft: canForemanAiEstimateRole("consumer", "write_foreman_draft"),
    fake_green_claimed: false as const,
  };
}
