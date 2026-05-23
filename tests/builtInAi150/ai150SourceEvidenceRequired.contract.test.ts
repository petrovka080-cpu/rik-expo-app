import { getAi150Artifacts } from "./ai150TestHelpers";

describe("built-in AI 150 source evidence", () => {
  it("requires source evidence for every priced row", () => {
    const { matrix, sourceEvidence } = getAi150Artifacts();

    expect(matrix.source_evidence_present_all_priced_rows).toBe(true);
    expect(sourceEvidence.every((entry) => entry.source_evidence_present)).toBe(true);
    expect(sourceEvidence.every((entry) => entry.priced_rows_without_source_evidence === 0)).toBe(true);
  });
});
