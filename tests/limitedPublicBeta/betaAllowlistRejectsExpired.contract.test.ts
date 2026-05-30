import { validateLimitedPublicBetaAllowlist } from "../../src/lib/ai/productionCanary";
import { allowlistWithEntries, LIMITED_BETA_TEST_NOW, realExternalAllowlistEntry } from "./betaAllowlistTestHelpers";

test("limited public beta rejects expired allowlist entries", () => {
  const validation = validateLimitedPublicBetaAllowlist(
    allowlistWithEntries([realExternalAllowlistEntry({ expiresAt: "2026-05-29T23:59:59.000Z" })]),
    { now: LIMITED_BETA_TEST_NOW },
  );

  expect(validation.valid).toBe(false);
  expect(validation.expired_entries_count).toBe(1);
  expect(validation.issues).toContain("ALLOWLIST_EXPIRED_ENTRY_FOUND");
});

