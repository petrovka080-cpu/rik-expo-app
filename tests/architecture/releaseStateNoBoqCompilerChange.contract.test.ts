import { cleanupSources } from "../releaseStateCleanup/releaseStateCleanupTestHelpers";

it("does not write into BOQ compiler paths", () => {
  expect(cleanupSources()).not.toMatch(/write(?:Json|Text)?\([^)]*src\/lib\/ai\/professionalBoq/);
});
