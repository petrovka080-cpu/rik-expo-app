import { expectReal10000ScopedOutForIosTestFlight, runP1EvidenceRefreshForTest } from "./p1EvidenceRefreshTestHelper";

test("Real10000 P1 evidence refresh is scoped out of internal iOS TestFlight without claiming green", () => {
  const result = runP1EvidenceRefreshForTest();

  expectReal10000ScopedOutForIosTestFlight(result);
  expect(result.p0_holes).toBe(5);
  expect(result.p1_holes).toBe(14);
  expect(result.p2_holes).toBe(2);
  expect(result.real_external_user_traffic_proven).toBe(false);
  expect(result.fake_green_claimed).toBe(false);
});
