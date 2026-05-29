import { REAL_DIVERSE_500_CONSTRUCTION_WORKS } from "../../src/lib/ai/estimatorKernel/fixtures/realDiverse500ConstructionWorks";

test("real 500 fixture covers at least 50 construction domains with 10 cases each", () => {
  const domains = new Map<string, number>();
  for (const item of REAL_DIVERSE_500_CONSTRUCTION_WORKS) {
    domains.set(item.domain, (domains.get(item.domain) ?? 0) + 1);
  }
  expect(domains.size).toBeGreaterThanOrEqual(50);
  expect([...domains.values()].every((count) => count === 10)).toBe(true);
});
