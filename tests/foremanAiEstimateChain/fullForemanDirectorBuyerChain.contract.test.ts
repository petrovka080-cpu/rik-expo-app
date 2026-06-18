import { buildForemanAiEstimateRoleChainAudit } from "../../src/lib/foremanAiEstimate/foremanAiEstimateChainAudit";

describe("foreman AI estimate full role chain contract", () => {
  it("maps every acceptance sample through foreman draft, director payload and buyer rows", () => {
    const audit = buildForemanAiEstimateRoleChainAudit();

    expect(audit.samples_checked).toBe(10);
    expect(audit.sample_results).toHaveLength(10);
    expect(audit.sample_results.every((sample) => sample.work_key_matches)).toBe(true);
    expect(audit.sample_results.every((sample) => sample.row_count > 0)).toBe(true);
    expect(audit.sample_results.every((sample) => sample.draft_line_count > 0)).toBe(true);
    expect(audit.sample_results.every((sample) => sample.buyer_row_count > 0)).toBe(true);
    expect(audit.foreman_creates_ai_estimate).toBe(true);
    expect(audit.foreman_saves_draft).toBe(true);
    expect(audit.foreman_submits_to_director).toBe(true);
    expect(audit.director_receives_same_estimate).toBe(true);
    expect(audit.director_sees_object_floor_section).toBe(true);
    expect(audit.director_can_approve).toBe(true);
    expect(audit.director_can_reject).toBe(true);
    expect(audit.buyer_receives_rows_after_approval).toBe(true);
  });
});
