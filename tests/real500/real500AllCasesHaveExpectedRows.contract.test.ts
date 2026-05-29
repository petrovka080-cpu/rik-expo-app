import { REAL_DIVERSE_500_CONSTRUCTION_WORKS } from "../../src/lib/ai/estimatorKernel/fixtures/realDiverse500ConstructionWorks";

test("every real 500 case declares work-specific required row tokens", () => {
  expect(REAL_DIVERSE_500_CONSTRUCTION_WORKS.every((item) => item.requiredRowTokens.length >= 4)).toBe(true);
});
