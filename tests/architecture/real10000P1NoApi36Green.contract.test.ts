import { runP1EvidenceRefreshForTest } from "../real10000Audit/p1EvidenceRefreshTestHelper";

test("Real10000 P1 refresh never accepts API36 as Android green", () => {
  const result = runP1EvidenceRefreshForTest();

  expect(result.android_api34_tested).toBe(true);
  expect(result.api36_rejected).toBe(true);
});
