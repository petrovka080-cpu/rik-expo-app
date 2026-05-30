import { expect, test } from "playwright/test";

import {
  buildAiEstimateLimitedPublicBetaPolicy,
  resolveLimitedPublicBetaEligibility,
} from "../../src/lib/ai/productionCanary";
import { writeLimitedPublicBetaWebArtifacts } from "../../scripts/e2e/aiEstimateLimitedPublicBetaExecutionCore";

test.describe("AI estimate limited public beta execution", () => {
  test("keeps public beta default-off and allows only manual allowlisted users", () => {
    const policy = buildAiEstimateLimitedPublicBetaPolicy({
      user_allowlist_ids: ["test-beta-user-bishkek"],
      user_allowlist_source: "test_staging",
    });
    const defaultBlocked = resolveLimitedPublicBetaEligibility({
      policy,
      userId: "test-beta-user-bishkek",
      country: "Kyrgyzstan",
      city: "Bishkek",
      entrypoint: "/request",
      manualEnable: false,
      percentBucket: 0.05,
      regulatedHighRisk: false,
    });
    const allowlisted = resolveLimitedPublicBetaEligibility({
      policy,
      userId: "test-beta-user-bishkek",
      country: "Kyrgyzstan",
      city: "Bishkek",
      entrypoint: "/request",
      manualEnable: true,
      percentBucket: 0.05,
      regulatedHighRisk: false,
    });
    const nonAllowlisted = resolveLimitedPublicBetaEligibility({
      policy,
      userId: "not-allowlisted",
      country: "Kyrgyzstan",
      city: "Bishkek",
      entrypoint: "/request",
      manualEnable: true,
      percentBucket: 0.05,
      regulatedHighRisk: false,
    });

    expect(defaultBlocked.eligible).toBe(false);
    expect(allowlisted.eligible).toBe(true);
    expect(nonAllowlisted.eligible).toBe(false);
  });

  test("runs web beta proof samples with telemetry feedback PDF and kill switch checks", () => {
    const web = writeLimitedPublicBetaWebArtifacts();
    expect(web.web_live_app_tested).toBe(true);
    expect(web.web_flows_passed).toBe(true);
    expect(web.runtimeTraceId_captured).toBe(true);
    expect(web.professional_boq_visible).toBe(true);
    expect(web.feedback_recorded).toBe(true);
    expect(web.telemetry_emitted).toBe(true);
    expect(web.kill_switch_disables_ai_estimate).toBe(true);
    expect(web.production_rollout_remains_disabled).toBe(true);
  });
});
