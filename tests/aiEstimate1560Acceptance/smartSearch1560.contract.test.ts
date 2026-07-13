import { smartSearch1560 } from "./aiEstimate1560AcceptanceTestHelpers";

describe("1560 acceptance smart search audit", () => {
  it("finds every sampled work and preserves selected work keys", () => {
    const audit = smartSearch1560();
    expect(audit.works_tested).toBe(1560);
    expect(audit.prompt_variants_total).toBeGreaterThanOrEqual(3120);
    expect(audit.correct_work_in_top_5_rate_min).toBe(true);
    expect(audit.wrong_similar_auto_selected).toBe(0);
    expect(audit.selected_work_key_lost).toBe(0);
    expect(audit.selected_work_compiles_same_template_failed).toBe(0);
    expect(audit.works_failed).toBe(0);
  });
});
