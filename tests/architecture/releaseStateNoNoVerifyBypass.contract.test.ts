import { cleanupSources } from "../releaseStateCleanup/releaseStateCleanupTestHelpers";

it("does not use no-verify from release-state cleanup automation", () => {
  expect(cleanupSources()).not.toContain("--no-verify");
});
