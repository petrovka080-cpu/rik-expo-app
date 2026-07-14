import {
  evaluateBlackboxCases,
  expandBlackboxCorpus,
} from "../../scripts/e2e/runEstimateBlackboxAcceptanceWebSmoke";

jest.setTimeout(240_000);

describe("blackbox historical broken cases", () => {
  it("keeps diamond drilling, profile fence, mansard roof and apartment 54 out of generic fallback", () => {
    const historical = evaluateBlackboxCases(
      expandBlackboxCorpus().filter((item) => item.source === "mandatory_broken_history"),
    );
    const byId = new Map(historical.map((item) => [item.case_id, item]));

    expect(historical.every((item) => item.professional)).toBe(true);
    expect(byId.get("diamond_drilling_full")?.selected_template_id).toBeTruthy();
    expect(byId.get("profile_sheet_fence_full")?.selected_template_id).toBeTruthy();
    expect(byId.get("mansard_roof_full")?.selected_template_id).toBeTruthy();
    expect(byId.get("diamond_drilling_bare")?.missing_parameters.length).toBeGreaterThan(0);
    expect(byId.get("profile_sheet_fence_bare")?.missing_parameters.length).toBeGreaterThan(0);
    expect(byId.get("mansard_roof_bare")?.missing_parameters.length).toBeGreaterThan(0);
    expect(byId.get("apartment_54")?.row_count).toBe(0);
    expect(byId.get("apartment_54")?.missing_parameters.length).toBeGreaterThan(0);
  });
});
