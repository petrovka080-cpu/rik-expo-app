import { readLimitedPublicBetaSources } from "./limitedPublicBetaArchitectureTestHelpers";

test("limited beta closeout never enables full public rollout in source", () => {
  expect(readLimitedPublicBetaSources()).not.toMatch(/full_public_rollout_enabled\s*:\s*true/);
});

