import { CONSTRUCTION_FORMULA_REGISTRY } from "../../src/lib/ai/constructionFormulas";
import { primitiveGraph } from "./primitiveBoqTestHelpers";

describe("construction primitive unit and formula policy", () => {
  it("requires formula candidates and unit policy for every domain and method", () => {
    expect(CONSTRUCTION_FORMULA_REGISTRY.length).toBeGreaterThanOrEqual(35);
    for (const domain of primitiveGraph.domains) {
      expect(domain.units.length).toBeGreaterThan(0);
      expect(domain.formulaCandidates.length).toBeGreaterThan(0);
      const formula = CONSTRUCTION_FORMULA_REGISTRY.find((item) => item.domain === domain.domain);
      expect(formula?.outputUnits.length).toBeGreaterThan(0);
    }
    for (const method of primitiveGraph.methods) {
      expect(method.unitPolicy.length).toBeGreaterThan(0);
      expect(method.formulaPolicy.length).toBeGreaterThan(0);
    }
  });
});
