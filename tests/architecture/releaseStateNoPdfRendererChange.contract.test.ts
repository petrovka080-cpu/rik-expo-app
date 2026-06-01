import { cleanupSources } from "../releaseStateCleanup/releaseStateCleanupTestHelpers";

it("does not write into PDF renderer paths", () => {
  expect(cleanupSources()).not.toMatch(/write(?:Json|Text)?\([^)]*src\/lib\/(?:estimatePdf|pdf)/);
});
