import {
  PRODUCTION_WORK_DEFINITIONS_10000,
  compileAllProductionTemplates10000,
} from "../../src/lib/ai/estimateTemplate10000";

describe("minimum row count 10000", () => {
  it("keeps every template above its minimum and total compiled rows above 250000", () => {
    const minimumByWorkKey = new Map(PRODUCTION_WORK_DEFINITIONS_10000.map((definition) => [definition.workKey, definition.minimumRows]));
    const audit = compileAllProductionTemplates10000();
    const belowMinimum = audit.results.filter((result) => result.rowCount < (minimumByWorkKey.get(result.workKey) ?? 999));

    expect(belowMinimum).toHaveLength(0);
    expect(audit.compiledRowsTotal).toBeGreaterThanOrEqual(250000);
    expect(audit.compiledRowsTotal / audit.results.length).toBeGreaterThanOrEqual(25);
  });
});
