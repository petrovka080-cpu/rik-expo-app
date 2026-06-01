import { cleanupSources } from "../releaseStateCleanup/releaseStateCleanupTestHelpers";

it("does not write into UI paths", () => {
  expect(cleanupSources()).not.toMatch(/write(?:Json|Text)?\([^)]*(?:app\/|src\/screens\/|src\/components\/|src\/features\/)/);
});
