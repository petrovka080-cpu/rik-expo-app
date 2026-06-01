import { cleanupSources } from "../releaseStateCleanup/releaseStateCleanupTestHelpers";

it("treats matrix repaint without proof as a blocker", () => {
  const source = cleanupSources();

  expect(source).toContain("MATRIX_REPAINT_WITHOUT_PROOF");
  expect(source).toContain("proof.md");
  expect(source).toContain("fake_green_claimed: false");
});
