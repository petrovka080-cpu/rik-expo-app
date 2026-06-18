import {
  PRODUCTION_WORK_DEFINITIONS_10000,
  compileProductionExpandedEstimate10000,
} from "../../src/lib/ai/estimateTemplate10000";

describe("materials and labor required 10000", () => {
  it("includes materials and labor sections for every compiled template", () => {
    for (const definition of PRODUCTION_WORK_DEFINITIONS_10000) {
      const compiled = compileProductionExpandedEstimate10000({ workKey: definition.workKey });
      expect(compiled.rows.some((row) => row.section === "materials")).toBe(true);
      expect(compiled.rows.some((row) => row.section === "labor")).toBe(true);
    }
  });
});
