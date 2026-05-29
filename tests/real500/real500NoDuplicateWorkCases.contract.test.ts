import { REAL_DIVERSE_500_CONSTRUCTION_WORKS } from "../../src/lib/ai/estimatorKernel/fixtures/realDiverse500ConstructionWorks";

test("real 500 fixture has no duplicate case ids or prompts", () => {
  expect(new Set(REAL_DIVERSE_500_CONSTRUCTION_WORKS.map((item) => item.caseId)).size).toBe(500);
  expect(new Set(REAL_DIVERSE_500_CONSTRUCTION_WORKS.map((item) => item.promptRu)).size).toBe(500);
});
