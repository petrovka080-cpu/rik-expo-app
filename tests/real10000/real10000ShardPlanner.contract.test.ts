import { REAL_10000_ACCEPTANCE_CONTRACT, REAL_DIVERSE_10000_CONSTRUCTION_WORKS } from "../../src/lib/ai/estimatorKernel/fixtures/realDiverse10000ConstructionWorks";

test("real 10000 shard planner defines 100 shards of 100 cases", () => {
  expect(REAL_10000_ACCEPTANCE_CONTRACT.requiredShards).toBe(100);
  expect(REAL_10000_ACCEPTANCE_CONTRACT.requiredCasesPerShard).toBe(100);
  expect(REAL_DIVERSE_10000_CONSTRUCTION_WORKS.length / REAL_10000_ACCEPTANCE_CONTRACT.requiredCasesPerShard).toBe(100);
});
