import { world50000Source } from "./world50000ArchitectureTestHelpers";

describe("world 50000 architecture - no production rollout", () => {
  it("keeps the proof wave from enabling rollout", () => {
    expect(world50000Source()).toContain("production_rollout_enabled: false");
  });
});
