import { cleanupSourceFiles } from "../releaseStateCleanup/releaseStateCleanupTestHelpers";

it("keeps release closeout changes outside product logic paths", () => {
  expect(cleanupSourceFiles.some((file) => file.startsWith("src/lib/ai/"))).toBe(false);
});
