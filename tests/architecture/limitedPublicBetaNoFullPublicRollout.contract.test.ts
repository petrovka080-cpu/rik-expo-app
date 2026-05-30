import { readLimitedPublicBetaSources } from "./limitedPublicBetaArchitectureTestHelpers";

test("limited public beta never enables full public rollout", () => {
  const source = readLimitedPublicBetaSources();
  expect(source).toContain("full_public_rollout_enabled");
  expect(source).not.toMatch(/full_public_rollout_enabled:\s*true/);
  expect(source).not.toMatch(/limited_public_beta_enabled_by_default:\s*true/);
});
