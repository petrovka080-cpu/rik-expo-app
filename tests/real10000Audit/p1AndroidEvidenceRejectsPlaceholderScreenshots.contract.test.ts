import { readAuditArtifact, runP1EvidenceRefreshForTest } from "./p1EvidenceRefreshTestHelper";

type AndroidAuthenticityArtifact = {
  placeholder_android_artifacts_found: boolean;
  screenshots_exist: boolean;
  xml_dumps_exist: boolean;
  unique_screenshot_paths: number;
};

test("Real10000 P1 Android evidence rejects placeholder screenshots", () => {
  runP1EvidenceRefreshForTest();
  const artifact = readAuditArtifact<AndroidAuthenticityArtifact>("android_evidence_authenticity.json");

  expect(artifact.placeholder_android_artifacts_found).toBe(false);
  expect(artifact.screenshots_exist).toBe(true);
  expect(artifact.xml_dumps_exist).toBe(true);
  expect(artifact.unique_screenshot_paths).toBeGreaterThan(1);
});
