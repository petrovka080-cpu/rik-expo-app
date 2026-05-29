import { REAL_DIVERSE_500_CONSTRUCTION_WORKS } from "../../src/lib/ai/estimatorKernel/fixtures/realDiverse500ConstructionWorks";

test("every real 500 case declares forbidden weak generic row tokens", () => {
  expect(REAL_DIVERSE_500_CONSTRUCTION_WORKS.every((item) => item.forbiddenRowTokens.includes("Строительные работы"))).toBe(true);
  expect(REAL_DIVERSE_500_CONSTRUCTION_WORKS.every((item) => item.forbiddenRowTokens.includes("дополнительные материалы"))).toBe(true);
});
