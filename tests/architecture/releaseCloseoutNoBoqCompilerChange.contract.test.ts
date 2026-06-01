import { cleanupSourceFiles } from "../releaseStateCleanup/releaseStateCleanupTestHelpers";

it("does not place release closeout edits in BOQ compiler paths", () => {
  expect(cleanupSourceFiles.some((file) => /professionalBoq|boq/i.test(file))).toBe(false);
});
