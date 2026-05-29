import { REAL_DIVERSE_10000_CONSTRUCTION_WORKS } from "../../src/lib/ai/estimatorKernel/fixtures/realDiverse10000ConstructionWorks";

test("real 10000 regulated cases require safety policy", () => {
  const regulated = REAL_DIVERSE_10000_CONSTRUCTION_WORKS.filter((item) => item.regulatedSafetyRequired);
  expect(regulated.length).toBeGreaterThanOrEqual(800);
  expect(regulated.every((item) => item.complexity === "regulated")).toBe(true);
});
