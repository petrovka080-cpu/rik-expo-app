import { runReal10000LiveEvidenceAudit } from "../../scripts/audit/real10000EstimateAuditCore";

test("live evidence audit requires web and Android evidence", () => {
  const result = runReal10000LiveEvidenceAudit({
    web: { web_live_prompts_passed: 0 },
    android: { android_api34_tested: false, android_api34_prompts_passed: 0, api36_rejected: false },
    screenshotsPresent: false,
    androidScreenshotsPresent: false,
    androidUiDumpsPresent: false,
  });

  expect(result.holes.map((hole) => hole.classification)).toEqual(expect.arrayContaining([
    "WEB_LIVE_EVIDENCE_MISSING",
    "ANDROID_API34_EVIDENCE_MISSING",
  ]));
});
