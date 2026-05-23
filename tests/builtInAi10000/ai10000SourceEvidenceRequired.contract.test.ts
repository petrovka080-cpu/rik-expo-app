import { getAi10000Artifacts } from "./ai10000TestHelpers";

describe("built-in AI 10000 source evidence", () => {
  it("keeps source evidence on every priced estimate row and product candidate", () => {
    const { matrix, sourceEvidence } = getAi10000Artifacts();

    expect(matrix.source_evidence_present_all_priced_rows).toBe(true);
    expect(sourceEvidence.estimateCases.every((trace) => trace.priced_rows_without_source_evidence === 0)).toBe(true);
    expect(sourceEvidence.productCases.every((trace) => trace.source_evidence_present)).toBe(true);
  });
});
