import { REAL_DIVERSE_500_CONSTRUCTION_WORKS } from "../../src/lib/ai/estimatorKernel/fixtures/realDiverse500ConstructionWorks";

test("regulated real 500 cases require safety policy", () => {
  const regulated = REAL_DIVERSE_500_CONSTRUCTION_WORKS.filter((item) => item.complexity === "regulated");
  expect(regulated.length).toBeGreaterThanOrEqual(40);
  expect(regulated.every((item) => item.regulatedSafetyRequired)).toBe(true);
});
