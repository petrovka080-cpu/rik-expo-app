import { expectReal10000ScopedOutForIosTestFlight, runP1EvidenceRefreshForTest } from "./p1EvidenceRefreshTestHelper";

test("Real10000 P1 Android evidence rejects stale HEAD SHA", () => {
  const result = runP1EvidenceRefreshForTest();

  expectReal10000ScopedOutForIosTestFlight(result);
  expect(result.real10000_required_for_ios_testflight_internal_qa).toBe(false);
});
