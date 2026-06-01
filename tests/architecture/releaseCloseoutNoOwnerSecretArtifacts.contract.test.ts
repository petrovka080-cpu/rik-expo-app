import { cleanupSources } from "../releaseStateCleanup/releaseStateCleanupTestHelpers";

it("does not write owner secret values into release closeout artifacts", () => {
  const source = cleanupSources();

  expect(source).not.toMatch(/OWNER_ACCOUNT_(EMAIL|PASSWORD)\s*=\s*["'][^"']+/);
  expect(source).not.toMatch(/API_KEY\s*=\s*["'][^"']+/);
  expect(source).toContain("OWNER_GATE_BLOCKED_STATUS");
});
