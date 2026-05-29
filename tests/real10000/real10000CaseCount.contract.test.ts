import { REAL_DIVERSE_10000_CONSTRUCTION_WORKS } from "../../src/lib/ai/estimatorKernel/fixtures/realDiverse10000ConstructionWorks";

test("real 10000 fixture contains exactly 10000 cases", () => {
  expect(REAL_DIVERSE_10000_CONSTRUCTION_WORKS).toHaveLength(10_000);
});
