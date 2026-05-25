import { WATERPROOFING_DISAMBIGUATION_CASES, allRowText, expectCaseResolves } from "./waterproofingDisambiguationTestHelpers";

describe("waterproofing expected BOQ rows", () => {
  it("returns work-family specific professional rows for disambiguated waterproofing cases", () => {
    for (const testCase of WATERPROOFING_DISAMBIGUATION_CASES) {
      const estimate = expectCaseResolves(testCase);
      const rowText = allRowText(estimate);

      for (const signal of testCase.expectedRowSignals ?? []) {
        expect(rowText).toContain(signal);
      }
    }
  });
});
