import { cleanupSources } from "../releaseStateCleanup/releaseStateCleanupTestHelpers";

it("does not repaint matrices to green in release closeout automation", () => {
  const source = cleanupSources();

  expect(source).not.toMatch(/replace\([^)]*BLOCKED[^)]*GREEN/i);
  expect(source).not.toMatch(/manually\s+empty/i);
  expect(source).toContain("fake_green_claimed: false");
});
