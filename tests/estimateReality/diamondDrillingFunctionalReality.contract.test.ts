import {
  evaluateWorkSpecificityCase,
  FUNCTIONAL_REALITY_CASES,
} from "../../scripts/estimate/validateEstimateWorkSpecificity";

describe("diamond drilling functional reality audit", () => {
  it("rejects an unadmitted diamond drilling source claim and blocks bare prompts on missing parameters", () => {
    const fullCase = FUNCTIONAL_REALITY_CASES.find((item) => item.case_id === "diamond_drilling_full");
    const bareCase = FUNCTIONAL_REALITY_CASES.find((item) => item.case_id === "diamond_drilling_bare");
    expect(fullCase).toBeDefined();
    expect(bareCase).toBeDefined();

    const full = evaluateWorkSpecificityCase(fullCase!);
    const bare = evaluateWorkSpecificityCase(bareCase!);

    expect(full.professional).toBe(false);
    expect(full.selected_work_key).toBe("diamond_concrete_drilling_reinforced_concrete");
    expect(full.source_backed_row_count).toBe(0);
    expect(full.known_work_generic_fallback_rejected).toBe(true);
    expect(full.blocking_reasons).toContain("known_work_generic_fallback");
    expect(bare.missing_parameters).toEqual(expect.arrayContaining(["holes_count", "diameter_mm"]));
    expect(bare.rows_generated_despite_missing_params).toBe(false);
    expect(bare.row_count).toBe(0);
    expect(bare.professional).toBe(true);
  });
});
