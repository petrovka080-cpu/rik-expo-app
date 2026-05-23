import { allRequiredEstimates } from "./globalEstimateTemplateRatebookTestHelpers";

describe("source evidence for priced global estimate rows", () => {
  it("ties every priced row to a source and source evidence", () => {
    for (const result of allRequiredEstimates()) {
      const sourceIds = new Set(result.sources.map((source) => source.id));
      for (const section of result.sections) {
        for (const row of section.rows.filter((item) => item.unitPrice > 0)) {
          expect(row.sourceId).toEqual(expect.any(String));
          expect(sourceIds.has(row.sourceId)).toBe(true);
          expect(row.sourceEvidence.length).toBeGreaterThan(0);
          expect(row.sourceEvidence[0]).toMatchObject({
            sourceId: row.sourceId,
            label: expect.any(String),
            checkedAt: expect.any(String),
          });
        }
      }
    }
  });
});
