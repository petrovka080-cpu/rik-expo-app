import { validateLimitedPublicBetaAllowlist } from "../../src/lib/ai/productionCanary";
import { allowlistWithEntries, LIMITED_BETA_TEST_NOW, realExternalAllowlistEntry } from "../limitedPublicBeta/betaAllowlistTestHelpers";

test("limited beta architecture rejects wildcard allowlist", () => {
  const validation = validateLimitedPublicBetaAllowlist(
    allowlistWithEntries([realExternalAllowlistEntry({ userId: "*" })]),
    { now: LIMITED_BETA_TEST_NOW },
  );

  expect(validation.wildcard_allowlist_found).toBe(true);
  expect(validation.valid).toBe(false);
});

