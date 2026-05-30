import { readAuditArtifact, runP1EvidenceRefreshForTest } from "./p1EvidenceRefreshTestHelper";

type AndroidPerCaseArtifact = {
  cases_total: number;
  cases: Array<{ caseId: string; route: string; prompt: string; runtimeTraceId: string | null; screenshot_path: string; ui_dump_path: string }>;
};

test("Real10000 P1 Android evidence requires per-case data", () => {
  runP1EvidenceRefreshForTest();
  const artifact = readAuditArtifact<AndroidPerCaseArtifact>("android_per_case_results.json");

  expect(artifact.cases_total).toBe(300);
  expect(artifact.cases).toHaveLength(300);
  expect(artifact.cases.every((item) => item.caseId && item.route && item.prompt)).toBe(true);
  expect(artifact.cases.every((item) => item.runtimeTraceId)).toBe(true);
  expect(artifact.cases.every((item) => item.screenshot_path && item.ui_dump_path)).toBe(true);
});
