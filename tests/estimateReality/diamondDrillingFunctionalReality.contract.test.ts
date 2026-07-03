import {
  evaluateWorkSpecificityCase,
  FUNCTIONAL_REALITY_CASES,
} from "../../scripts/estimate/validateEstimateWorkSpecificity";

describe("diamond drilling functional reality audit", () => {
  it("revokes professional status when diamond drilling resolves to concrete placing fallback", () => {
    const fullCase = FUNCTIONAL_REALITY_CASES.find((item) => item.case_id === "diamond_drilling_full");
    const bareCase = FUNCTIONAL_REALITY_CASES.find((item) => item.case_id === "diamond_drilling_bare");
    expect(fullCase).toBeDefined();
    expect(bareCase).toBeDefined();

    const full = evaluateWorkSpecificityCase(fullCase!);
    const bare = evaluateWorkSpecificityCase(bareCase!);

    expect(full.professional).toBe(false);
    expect(full.known_work_generic_fallback_rejected).toBe(true);
    expect(full.blocking_reasons).toEqual(expect.arrayContaining([
      "diamond_drilling_resolved_to_concrete_placing_template",
      "known_work_generic_fallback",
    ]));
    expect(bare.missing_parameters).toEqual(expect.arrayContaining(["holes_count", "diameter_mm"]));
    expect(bare.rows_generated_despite_missing_params).toBe(true);
  });
});
