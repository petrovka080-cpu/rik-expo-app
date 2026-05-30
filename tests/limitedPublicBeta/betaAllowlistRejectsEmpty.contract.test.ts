import { validateLimitedPublicBetaAllowlist } from "../../src/lib/ai/productionCanary";
import { allowlistWithEntries, LIMITED_BETA_TEST_NOW } from "./betaAllowlistTestHelpers";

test("limited public beta rejects an empty allowlist", () => {
  const validation = validateLimitedPublicBetaAllowlist(
    allowlistWithEntries([]),
    { now: LIMITED_BETA_TEST_NOW },
  );

  expect(validation.valid).toBe(false);
  expect(validation.allowlist_empty).toBe(true);
  expect(validation.issues).toContain("ALLOWLIST_EMPTY");
});

