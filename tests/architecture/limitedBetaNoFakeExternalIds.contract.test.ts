import { validateLimitedPublicBetaAllowlist } from "../../src/lib/ai/productionCanary";
import { allowlistWithEntries, LIMITED_BETA_TEST_NOW, realExternalAllowlistEntry } from "../limitedPublicBeta/betaAllowlistTestHelpers";

test("limited beta architecture rejects fake external IDs as rollout evidence", () => {
  const validation = validateLimitedPublicBetaAllowlist(
    allowlistWithEntries([realExternalAllowlistEntry({ userId: "dummy-beta-user" })]),
    { now: LIMITED_BETA_TEST_NOW },
  );

  expect(validation.fake_external_ids_found).toBe(true);
  expect(validation.real_external_allowlist_ids_present).toBe(false);
});

