import { validateLimitedPublicBetaAllowlist } from "../../src/lib/ai/productionCanary";
import { allowlistWithEntries, LIMITED_BETA_TEST_NOW, realExternalAllowlistEntry } from "./betaAllowlistTestHelpers";

test("limited public beta enforces country and city allowlist policy", () => {
  const validation = validateLimitedPublicBetaAllowlist(
    allowlistWithEntries([realExternalAllowlistEntry({ country: "United States", city: "New York" })]),
    { now: LIMITED_BETA_TEST_NOW },
  );

  expect(validation.valid).toBe(false);
  expect(validation.wrong_country_city_count).toBe(1);
  expect(validation.issues).toContain("ALLOWLIST_COUNTRY_CITY_INVALID");
});

