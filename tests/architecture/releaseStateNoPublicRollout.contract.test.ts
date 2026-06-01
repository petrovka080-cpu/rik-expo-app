import { cleanupSources } from "../releaseStateCleanup/releaseStateCleanupTestHelpers";

it("does not enable public rollout, public beta, EAS build, or App Review submit", () => {
  const source = cleanupSources();

  expect(source).toContain("production_rollout_enabled: false");
  expect(source).toContain("public_beta_enabled: false");
  expect(source).not.toMatch(/\beas\s+(?:build|submit)\b/i);
  expect(source).not.toContain("--submit-for-review");
});
