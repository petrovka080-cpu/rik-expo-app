import { cleanupSources } from "../releaseStateCleanup/releaseStateCleanupTestHelpers";

it("does not use no-verify in release closeout automation", () => {
  expect(cleanupSources()).not.toContain("--no-verify");
});
