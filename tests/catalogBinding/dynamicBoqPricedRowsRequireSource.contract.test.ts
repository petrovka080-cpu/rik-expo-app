import { requestEstimate, UNIVERSAL_PROMPTS } from "../estimatorKernel/universalEstimatorTestHelpers";

describe("dynamic BOQ priced rows require source evidence", () => {
  it("does not price rows without source evidence", () => {
    const estimate = requestEstimate(UNIVERSAL_PROMPTS.concretePedestals);
    const rows = estimate.sections.flatMap((section) => section.rows);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.sourceEvidence.length > 0 && row.sourceId)).toBe(true);
  });
});
