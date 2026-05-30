import {
  isRealExternalLimitedPublicBetaIdentifier,
  validateLimitedPublicBetaAllowlist,
} from "../../src/lib/ai/productionCanary";
import { allowlistWithEntries, LIMITED_BETA_TEST_NOW, realExternalAllowlistEntry } from "./betaAllowlistTestHelpers";

test("limited public beta rejects fake IDs and accepts real external-looking IDs", () => {
  const fakeValidation = validateLimitedPublicBetaAllowlist(
    allowlistWithEntries([realExternalAllowlistEntry({ userId: "test-beta-user" })]),
    { now: LIMITED_BETA_TEST_NOW },
  );
  const realValidation = validateLimitedPublicBetaAllowlist(
    allowlistWithEntries([realExternalAllowlistEntry()]),
    { now: LIMITED_BETA_TEST_NOW },
  );

  expect(isRealExternalLimitedPublicBetaIdentifier("test-beta-user")).toBe(false);
  expect(fakeValidation.fake_external_ids_found).toBe(true);
  expect(realValidation.real_external_allowlist_ids_present).toBe(true);
  expect(realValidation.valid).toBe(true);
});

