import { cleanupSourceFiles } from "../releaseStateCleanup/releaseStateCleanupTestHelpers";

it("does not place release closeout edits in UI paths", () => {
  expect(
    cleanupSourceFiles.some((file) =>
      /^(app|components|screens|src\/components|src\/screens)\//.test(file),
    ),
  ).toBe(false);
});
