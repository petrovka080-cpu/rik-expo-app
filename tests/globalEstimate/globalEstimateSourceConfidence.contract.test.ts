import { buildGlobalEstimateFixture } from "./globalEstimateTestHarness";

describe("global estimate source confidence contract", () => {
  it("does not use prices without source metadata and downgrades insufficient tax precision", async () => {
    const { result } = await buildGlobalEstimateFixture({ text: "Need laminate installation for 1000 sq ft in Texas", language: "en" });
    const sourceIds = new Set(result.sources.map((source) => source.id));

    for (const section of result.sections) {
      for (const row of section.rows) {
        expect(sourceIds.has(row.sourceId)).toBe(true);
      }
    }
    expect(result.tax.taxType).toBe("unknown");
    expect(result.confidence).not.toBe("high");
  });
});
