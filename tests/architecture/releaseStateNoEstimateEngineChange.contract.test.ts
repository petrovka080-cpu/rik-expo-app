import { cleanupSources } from "../releaseStateCleanup/releaseStateCleanupTestHelpers";

it("does not write into estimate engine paths", () => {
  expect(cleanupSources()).not.toMatch(/write(?:Json|Text)?\([^)]*src\/lib\/ai\/(?:estimatorKernel|globalEstimate)/);
});
