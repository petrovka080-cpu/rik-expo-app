import { cleanupSources } from "../releaseStateCleanup/releaseStateCleanupTestHelpers";

it("does not use git clean force in release closeout automation", () => {
  expect(cleanupSources()).not.toMatch(/git\s+clean\s+-[^\n]*f|clean\s+-fd/i);
});
