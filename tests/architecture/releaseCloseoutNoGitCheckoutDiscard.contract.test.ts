import { cleanupSources } from "../releaseStateCleanup/releaseStateCleanupTestHelpers";

it("does not use git checkout to discard work in release closeout automation", () => {
  expect(cleanupSources()).not.toMatch(/git\s+checkout\s+(--|\.)|checkout\s+--\s+\./i);
});
