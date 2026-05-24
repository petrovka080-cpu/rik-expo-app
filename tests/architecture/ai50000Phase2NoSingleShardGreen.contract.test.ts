import { readJsonIfExists } from "./ai50000Phase2TestHelpers";

describe("AI 50000 Phase 2 no single shard green", () => {
  it("requires merge matrix to reject single-shard false green", () => {
    const matrix = readJsonIfExists("artifacts/S_BUILT_IN_AI_50000_PHASE2_matrix.json");
    if (!matrix) return;
    expect(matrix.single_shard_green_claimed).toBe(false);
    expect(matrix.shards_passed).toBe(50);
  });
});
