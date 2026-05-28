import { CONSTRUCTION_FORMULA_REGISTRY } from "../../src/lib/ai/constructionFormulas";
import { primitiveGraph } from "../constructionPrimitives/primitiveBoqTestHelpers";

describe("construction formula registry", () => {
  it("covers every primitive domain with input and output unit policy", () => {
    const formulaDomains = new Set(CONSTRUCTION_FORMULA_REGISTRY.map((policy) => policy.domain));
    expect(CONSTRUCTION_FORMULA_REGISTRY.length).toBeGreaterThanOrEqual(35);
    for (const domain of primitiveGraph.domains) {
      expect(formulaDomains.has(domain.domain)).toBe(true);
      const policy = CONSTRUCTION_FORMULA_REGISTRY.find((item) => item.domain === domain.domain);
      expect(policy?.formulaCandidates.length).toBeGreaterThan(0);
      expect(policy?.allowedInputUnits.length).toBeGreaterThan(0);
      expect(policy?.outputUnits.length).toBeGreaterThan(0);
    }
  });
});
