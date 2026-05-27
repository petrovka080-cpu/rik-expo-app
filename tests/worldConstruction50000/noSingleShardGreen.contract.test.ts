import { buildWorld50000ShardArtifacts } from "./worldConstruction50000TestHelpers";

describe("world construction 50000 no single shard green", () => {
  it("keeps single shard green claims disabled", () => {
    expect(buildWorld50000ShardArtifacts(0).matrix.single_shard_green_claimed).toBe(false);
  });
});
