import { REAL_DIVERSE_10000_CONSTRUCTION_WORKS } from "../../src/lib/ai/estimatorKernel/fixtures/realDiverse10000ConstructionWorks";

test("real 10000 cases declare unit semantics rules", () => {
  expect(REAL_DIVERSE_10000_CONSTRUCTION_WORKS.every((item) => item.unitRules.length >= 1)).toBe(true);
});
