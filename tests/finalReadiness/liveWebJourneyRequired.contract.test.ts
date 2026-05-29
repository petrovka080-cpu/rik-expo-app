import { finalReadinessReport } from "./finalReadinessTestHelpers";

it("requires live web journey proof before GO", () => {
  expect(finalReadinessReport().matrix.live_web_journey_passed).toBe(true);
});

