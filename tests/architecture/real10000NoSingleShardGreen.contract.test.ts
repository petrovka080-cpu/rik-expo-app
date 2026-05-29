import fs from "node:fs";

test("real 10000 shard proof cannot claim global green from one shard", () => {
  const source = fs.readFileSync("scripts/e2e/runReal10000DiverseConstructionWorksShardProof.ts", "utf8");
  expect(source).toContain("REAL_10000_SHARD_OK");
  expect(source).toContain("single_shard_green_claimed: false");
  expect(source).not.toContain("GREEN_REAL_10000_DIVERSE_CONSTRUCTION_WORKS_EXPANDED_ESTIMATE_READY");
});
