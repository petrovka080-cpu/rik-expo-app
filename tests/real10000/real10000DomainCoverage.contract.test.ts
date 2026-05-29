import { REAL_DIVERSE_10000_CONSTRUCTION_WORKS } from "../../src/lib/ai/estimatorKernel/fixtures/realDiverse10000ConstructionWorks";

test("real 10000 fixture covers at least 100 acceptance domains", () => {
  expect(new Set(REAL_DIVERSE_10000_CONSTRUCTION_WORKS.map((item) => item.domain)).size).toBeGreaterThanOrEqual(100);
});
