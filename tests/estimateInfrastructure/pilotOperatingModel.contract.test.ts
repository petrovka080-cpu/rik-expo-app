import { validateAiEstimatePilotOperatingModel } from "../../src/lib/platform/aiEstimatePilotOperatingModel";

describe("AI estimate pilot operating model", () => {
  it("limits cohort, roles, high-risk work, P0 stop and public beta", () => {
    const validation = validateAiEstimatePilotOperatingModel();

    expect(validation.pilot_operating_model_created).toBe(true);
    expect(validation.cohort_size_limited).toBe(true);
    expect(validation.allowed_roles_defined).toBe(true);
    expect(validation.allowed_work_families_defined).toBe(true);
    expect(validation.high_risk_controls_defined).toBe(true);
    expect(validation.p0_auto_stop_enabled).toBe(true);
    expect(validation.owner_go_no_go_required).toBe(true);
    expect(validation.public_beta_forbidden).toBe(true);
    expect(validation.passed).toBe(true);
  });
});
