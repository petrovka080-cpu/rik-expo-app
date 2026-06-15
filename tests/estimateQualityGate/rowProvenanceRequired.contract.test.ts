import { blockedGateFor, expectBlockedWith } from "./estimateQualityGateTestHelpers";

describe("estimate quality provenance", () => {
  it("blocks rows without provenance", () => {
    expectBlockedWith(blockedGateFor("row_without_provenance"), "ROW_WITHOUT_PROVENANCE");
  });
});
