import { validateEstimateBoqDepth } from "../../src/lib/ai/globalEstimate";
import { allRows, stripFoundationEstimate } from "./boqDepthTestHelpers";

describe("strip foundation professional BOQ depth", () => {
  it("renders at least twelve professional rows across material, labor and delivery/equipment", () => {
    const estimate = stripFoundationEstimate();
    const depth = validateEstimateBoqDepth(estimate);
    const rowCodes = allRows(estimate).map((row) => row.code);

    expect(estimate.work.workKey).toBe("strip_foundation");
    expect(depth.actualRows).toBeGreaterThanOrEqual(12);
    expect(depth.passed).toBe(true);
    expect(rowCodes).toEqual(expect.arrayContaining([
      "strip_foundation_formwork_material",
      "strip_foundation_longitudinal_rebar",
      "strip_foundation_stirrups_rebar",
      "strip_foundation_concrete_m300",
      "strip_foundation_concrete_delivery",
      "strip_foundation_concrete_pump",
    ]));
  });
});
