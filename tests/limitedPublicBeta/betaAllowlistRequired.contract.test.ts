import { validateLimitedPublicBetaAllowlist } from "../../src/lib/ai/productionCanary";
import { allowlistWithEntries, LIMITED_BETA_TEST_NOW } from "./betaAllowlistTestHelpers";

test("limited public beta requires an explicit allowlist source", () => {
  const validation = validateLimitedPublicBetaAllowlist(
    allowlistWithEntries([], { source: "missing" }),
    { now: LIMITED_BETA_TEST_NOW },
  );

  expect(validation.allowlist_required).toBe(true);
  expect(validation.allowlist_present).toBe(false);
  expect(validation.issues).toContain("ALLOWLIST_MISSING");
});

