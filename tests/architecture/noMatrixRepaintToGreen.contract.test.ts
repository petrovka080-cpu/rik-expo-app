import { cleanupSources } from "../releaseStateCleanup/releaseStateCleanupTestHelpers";

it("does not repaint blocked matrices to green", () => {
  const source = cleanupSources();

  expect(source).toContain("MATRIX_REPAINT_WITHOUT_PROOF");
  expect(source).not.toMatch(/replace\([^)]*BLOCKED[^)]*GREEN/);
  expect(source).not.toMatch(/final_status:\s*["']GREEN_[^"']*["'][\s\S]{0,120}owner_account_session_verified:\s*true/);
});
