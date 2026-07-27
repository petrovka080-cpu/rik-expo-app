import {
  evaluateBlackboxCases,
  expandBlackboxCorpus,
} from "../../scripts/e2e/runEstimateBlackboxAcceptanceWebSmoke";

jest.setTimeout(240_000);

describe("blackbox historical broken cases", () => {
  it("keeps the seven specialist outcomes proven and blocks three unverified catalog estimates", () => {
    const historical = evaluateBlackboxCases(
      expandBlackboxCorpus().filter((item) => item.source === "mandatory_broken_history"),
    );
    const byId = new Map(historical.map((item) => [item.case_id, item]));

    expect(historical).toHaveLength(10);
    expect(historical.filter((item) => item.professional).map((item) => item.case_id)).toEqual([
      "diamond_drilling_bare",
      "diamond_drilling_full",
      "profile_sheet_fence_bare",
      "profile_sheet_fence_full",
      "mansard_roof_bare",
      "mansard_roof_full",
      "apartment_54",
    ]);
    expect(historical.filter((item) => !item.professional).map((item) => item.case_id)).toEqual([
      "masonry_400_gas_block",
      "screed_100_50",
      "reinforcement_slab_100_12_200",
    ]);
    expect(byId.get("diamond_drilling_full")?.selected_template_id).toBeTruthy();
    expect(byId.get("profile_sheet_fence_full")?.selected_template_id).toBeTruthy();
    expect(byId.get("mansard_roof_full")?.selected_template_id).toBeTruthy();
    expect(byId.get("diamond_drilling_bare")?.missing_parameters.length).toBeGreaterThan(0);
    expect(byId.get("profile_sheet_fence_bare")?.missing_parameters.length).toBeGreaterThan(0);
    expect(byId.get("mansard_roof_bare")?.missing_parameters.length).toBeGreaterThan(0);
    expect(byId.get("apartment_54")?.row_count).toBe(0);
    expect(byId.get("apartment_54")?.missing_parameters.length).toBeGreaterThan(0);
    expect(byId.get("masonry_400_gas_block")?.row_count).toBe(59);
    expect(byId.get("screed_100_50")?.row_count).toBe(59);
    expect(byId.get("reinforcement_slab_100_12_200")?.row_count).toBe(59);
  });
});
