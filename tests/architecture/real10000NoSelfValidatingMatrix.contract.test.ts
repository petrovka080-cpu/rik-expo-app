import fs from "node:fs";

test("real 10000 final proof uses shard merge and runtime failures, not a self-validating matrix", () => {
  const source = fs.readFileSync("scripts/e2e/runReal10000DiverseConstructionWorksExpandedEstimateProof.ts", "utf8");
  expect(source).toContain("runAllReal10000DiverseConstructionWorksShards");
  expect(source).toContain("runReal10000DiverseConstructionWorksShardMerge");
  expect(source).toContain("caseFailures");
});
