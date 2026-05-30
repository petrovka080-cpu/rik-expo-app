import { validateLimitedPublicBetaAllowlist } from "../../src/lib/ai/productionCanary";
import { allowlistWithEntries, LIMITED_BETA_TEST_NOW, realExternalAllowlistEntry } from "./betaAllowlistTestHelpers";

test("limited public beta rejects wildcard allowlist entries", () => {
  const validation = validateLimitedPublicBetaAllowlist(
    allowlistWithEntries([realExternalAllowlistEntry({ userId: "*" })]),
    { now: LIMITED_BETA_TEST_NOW },
  );

  expect(validation.valid).toBe(false);
  expect(validation.wildcard_allowlist_found).toBe(true);
  expect(validation.issues).toContain("WILDCARD_ALLOWLIST_FOUND");
});

