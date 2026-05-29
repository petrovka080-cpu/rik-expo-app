import { finalReadinessReport } from "../finalReadiness/finalReadinessTestHelpers";

it("does not claim fake green in final readiness", () => {
  expect(finalReadinessReport().matrix.fake_green_claimed).toBe(false);
});

