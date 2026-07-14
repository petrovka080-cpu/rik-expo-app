import { expectReal10000ScopedOutForIosTestFlight, runP1EvidenceRefreshForTest } from "../real10000Audit/p1EvidenceRefreshTestHelper";

test("Real10000 P1 refresh rejects placeholder Android artifacts", () => {
  const result = runP1EvidenceRefreshForTest();

  expectReal10000ScopedOutForIosTestFlight(result);
  expect(result.real10000_required_for_ios_testflight_internal_qa).toBe(false);
});
