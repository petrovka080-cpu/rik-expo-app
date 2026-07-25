import {
  planWeightedJestShards,
  validateWeightedJestShardPlan,
  type WeightedJestManifestEntry,
} from "../../scripts/release/runDeterministicShardedFullJest";

function entry(testPath: string, weight: number): WeightedJestManifestEntry {
  return {
    test_path: testPath,
    source_bytes: weight,
    declared_tests: 1,
    weight,
    content_sha256: `sha-${testPath}`,
  };
}

describe("deterministic sharded full Jest runner", () => {
  const manifest = [
    entry("tests/a.test.ts", 90),
    entry("tests/b.test.ts", 80),
    entry("tests/c.test.ts", 70),
    entry("tests/d.test.ts", 60),
    entry("tests/e.test.ts", 50),
    entry("tests/f.test.ts", 40),
  ];

  it("assigns every manifest file exactly once with stable weighted balancing", () => {
    const first = planWeightedJestShards(manifest, 3);
    const second = planWeightedJestShards([...manifest].reverse(), 3);

    expect(second).toEqual(first);
    expect(validateWeightedJestShardPlan(manifest, first)).toEqual({
      missing: [],
      duplicates: [],
      unexpected: [],
    });
    expect(first.map((shard) => shard.weight)).toEqual([130, 130, 130]);
  });

  it("rejects duplicate, missing, and unexpected shard membership", () => {
    const invalid = planWeightedJestShards(manifest, 3);
    invalid[0].test_files.push("tests/a.test.ts", "tests/unexpected.test.ts");
    invalid[1].test_files = invalid[1].test_files.filter((file) => file !== "tests/b.test.ts");

    expect(validateWeightedJestShardPlan(manifest, invalid)).toEqual({
      missing: ["tests/b.test.ts"],
      duplicates: ["tests/a.test.ts"],
      unexpected: ["tests/unexpected.test.ts"],
    });
  });
});
