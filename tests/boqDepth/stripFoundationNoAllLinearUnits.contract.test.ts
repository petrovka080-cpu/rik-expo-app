import { validateEstimateUnitSemantics } from "../../src/lib/ai/globalEstimate";
import { allRows, stripFoundationEstimate } from "./boqDepthTestHelpers";

describe("strip foundation unit semantics", () => {
  it("does not output all foundation rows as linear_m and keeps concrete as m3", () => {
    const estimate = stripFoundationEstimate();
    const rows = allRows(estimate);
    const units = new Set(rows.map((row) => row.unit));
    const validation = validateEstimateUnitSemantics(estimate);

    expect(units.has("linear_m")).toBe(false);
    expect(units.size).toBeGreaterThan(1);
    expect(validation).toMatchObject({
      passed: true,
      allRowsLinearM: false,
      blockers: [],
    });
    expect(rows.find((row) => row.code === "strip_foundation_concrete_m300")?.unit).toBe("m3");
  });
});
