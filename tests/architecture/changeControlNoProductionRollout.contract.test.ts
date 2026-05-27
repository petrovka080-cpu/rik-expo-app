import { changeControlSource } from "./changeControlArchitectureTestHelpers";

describe("change control architecture - no production rollout", () => {
  it("keeps rollout disabled in the proof matrix", () => {
    expect(changeControlSource()).toContain("production_rollout_enabled: false");
  });
});
