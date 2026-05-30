import { validateLimitedPublicBetaAllowlist } from "../../src/lib/ai/productionCanary";
import { allowlistWithEntries, LIMITED_BETA_TEST_NOW, realExternalAllowlistEntry } from "./betaAllowlistTestHelpers";

test("limited public beta rejects disabled allowlist entries", () => {
  const validation = validateLimitedPublicBetaAllowlist(
    allowlistWithEntries([realExternalAllowlistEntry({ enabled: false })]),
    { now: LIMITED_BETA_TEST_NOW },
  );

  expect(validation.valid).toBe(false);
  expect(validation.disabled_entries_count).toBe(1);
  expect(validation.issues).toContain("ALLOWLIST_DISABLED_ENTRY_FOUND");
});

