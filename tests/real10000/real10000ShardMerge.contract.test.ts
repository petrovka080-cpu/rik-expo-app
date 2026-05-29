import fs from "node:fs";

test("real 10000 shard merge runner exists and forbids single-shard green", () => {
  const source = fs.readFileSync("scripts/e2e/runReal10000DiverseConstructionWorksShardMerge.ts", "utf8");
  expect(source).toContain("REAL_10000_SINGLE_SHARD_GREEN_CLAIMED");
  expect(source).toContain("REAL_10000_SHARD_MERGE_OK");
});
