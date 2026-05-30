import { resolveLimitedPublicBetaAllowlistEligibility } from "../../src/lib/ai/productionCanary";
import { allowlistWithEntries, LIMITED_BETA_TEST_NOW, realExternalAllowlistEntry } from "./betaAllowlistTestHelpers";

test("limited public beta kill switch overrides an allowlisted user", () => {
  const result = resolveLimitedPublicBetaAllowlistEligibility({
    allowlist: allowlistWithEntries([realExternalAllowlistEntry()]),
    userId: "usr_01J0REALALLOWLIST0001",
    country: "Kyrgyzstan",
    city: "Bishkek",
    manualEnable: true,
    regulatedHighRisk: false,
    killSwitchActive: true,
    now: LIMITED_BETA_TEST_NOW,
  });

  expect(result.eligible).toBe(false);
  expect(result.status).toBe("blocked_kill_switch");
});

