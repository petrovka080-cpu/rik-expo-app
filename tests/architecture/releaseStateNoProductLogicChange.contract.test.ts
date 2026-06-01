import { cleanupSourceFiles } from "../releaseStateCleanup/releaseStateCleanupTestHelpers";

it("keeps release-state cleanup source files out of product logic paths", () => {
  expect(cleanupSourceFiles.filter((file) => file.startsWith("src/"))).toEqual([]);
});
