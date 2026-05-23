import { getAi1000Artifacts } from "../builtInAi1000/ai1000TestHelpers";

describe("built-in AI 1000 architecture: no fake sources", () => {
  it("fails if any priced row lacks source evidence or fake availability appears", () => {
    const { matrix, sourceEvidence } = getAi1000Artifacts();

    expect(matrix.source_evidence_present_all_priced_rows).toBe(true);
    expect(sourceEvidence.estimateCases.every((trace) => trace.priced_rows_without_source_evidence === 0)).toBe(true);
    expect(sourceEvidence.productCases.every((trace) => trace.source_evidence_present)).toBe(true);
    expect(matrix.fake_stock_or_availability_found).toBe(false);
    expect(matrix.fake_supplier_found).toBe(false);
  });
});
