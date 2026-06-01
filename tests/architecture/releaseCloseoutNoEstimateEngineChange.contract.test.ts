import { cleanupSourceFiles } from "../releaseStateCleanup/releaseStateCleanupTestHelpers";

it("does not place release closeout edits in estimate engine paths", () => {
  expect(cleanupSourceFiles.some((file) => file.includes("estimatorKernel"))).toBe(false);
  expect(cleanupSourceFiles.some((file) => file.includes("globalEstimate"))).toBe(false);
});
