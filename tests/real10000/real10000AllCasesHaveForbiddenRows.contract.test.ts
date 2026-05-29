import { REAL_DIVERSE_10000_CONSTRUCTION_WORKS } from "../../src/lib/ai/estimatorKernel/fixtures/realDiverse10000ConstructionWorks";

test("real 10000 cases declare forbidden generic row tokens", () => {
  expect(REAL_DIVERSE_10000_CONSTRUCTION_WORKS.every((item) => item.forbiddenRowTokens.length >= 8)).toBe(true);
});
