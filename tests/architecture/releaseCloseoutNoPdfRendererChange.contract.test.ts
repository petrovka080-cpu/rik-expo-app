import { cleanupSourceFiles } from "../releaseStateCleanup/releaseStateCleanupTestHelpers";

it("does not place release closeout edits in PDF renderer paths", () => {
  expect(cleanupSourceFiles.some((file) => file.startsWith("src/lib/estimatePdf/"))).toBe(false);
  expect(cleanupSourceFiles.some((file) => file.startsWith("src/lib/pdf/"))).toBe(false);
});
