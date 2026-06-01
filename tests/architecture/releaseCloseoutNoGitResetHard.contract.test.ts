import { cleanupSources } from "../releaseStateCleanup/releaseStateCleanupTestHelpers";

it("does not use git reset hard in release closeout automation", () => {
  expect(cleanupSources()).not.toMatch(/git\s+reset\s+--hard|reset\s+--hard/i);
});
