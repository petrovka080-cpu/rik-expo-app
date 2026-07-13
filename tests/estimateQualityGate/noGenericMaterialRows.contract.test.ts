import { blockedGateFor, expectBlockedWith } from "./estimateQualityGateTestHelpers";

describe("estimate quality generic material guard", () => {
  it("blocks generic material rows", () => {
    expectBlockedWith(blockedGateFor("generic_material_row"), "GENERIC_MATERIAL_ROW");
  });
});
