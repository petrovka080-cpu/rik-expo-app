import { REAL_DIVERSE_500_CONSTRUCTION_WORKS } from "../../src/lib/ai/estimatorKernel/fixtures/realDiverse500ConstructionWorks";

test("real 500 fixture contains exactly 500 work cases", () => {
  expect(REAL_DIVERSE_500_CONSTRUCTION_WORKS).toHaveLength(500);
});
