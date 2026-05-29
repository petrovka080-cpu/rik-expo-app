import { REAL_DIVERSE_10000_CONSTRUCTION_WORKS } from "../../src/lib/ai/estimatorKernel/fixtures/realDiverse10000ConstructionWorks";

test("real 10000 fixture has no duplicate case IDs or prompts within a route", () => {
  const ids = REAL_DIVERSE_10000_CONSTRUCTION_WORKS.map((item) => item.caseId);
  const routedPrompts = REAL_DIVERSE_10000_CONSTRUCTION_WORKS.map((item) => `${item.route}:${item.promptRu}`);
  expect(new Set(ids).size).toBe(ids.length);
  expect(new Set(routedPrompts).size).toBe(routedPrompts.length);
});
