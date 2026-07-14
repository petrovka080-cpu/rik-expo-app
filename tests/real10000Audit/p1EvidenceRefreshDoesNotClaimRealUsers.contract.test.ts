import { expectReal10000ScopedOutForIosTestFlight, runP1EvidenceRefreshForTest } from "./p1EvidenceRefreshTestHelper";

test("Real10000 P1 evidence refresh does not claim real users", () => {
  const result = runP1EvidenceRefreshForTest();

  expectReal10000ScopedOutForIosTestFlight(result);
  expect(result.real_external_user_traffic_proven).toBe(false);
  expect(result.real_user_traffic_claimed).toBe(false);
});
