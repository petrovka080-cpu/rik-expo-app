import { finalReadinessReport } from "./finalReadinessTestHelpers";

it("requires AI estimate kill switches before final readiness GO", () => {
  expect(finalReadinessReport().matrix.kill_switch_ready).toBe(true);
});

