import { runP1EvidenceRefreshForTest } from "../real10000Audit/p1EvidenceRefreshTestHelper";

test("Real10000 P1 refresh rejects placeholder Android artifacts", () => {
  const result = runP1EvidenceRefreshForTest();

  expect(result.placeholder_android_artifacts_found).toBe(false);
  expect(result.android_screenshots_real).toBe(true);
  expect(result.android_ui_dumps_real).toBe(true);
});
