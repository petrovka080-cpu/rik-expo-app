import { buildWorld50000ShardArtifacts } from "./worldConstruction50000TestHelpers";

describe("world construction 50000 shard runner generic row gate", () => {
  it("records generic row failures as shard blockers", () => {
    const shard = buildWorld50000ShardArtifacts(0);
    expect(shard.matrix.generic_known_work_rows_found).toBe(false);
    expect(shard.results.every((item) => item.failureCodes.includes("GENERIC_KNOWN_WORK_ROWS_FOUND"))).toBe(false);
  });
});
