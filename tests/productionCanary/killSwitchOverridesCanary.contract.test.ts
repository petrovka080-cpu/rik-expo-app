import { applyAiEstimateKillSwitchPolicy } from "../../src/lib/ai/killSwitch/aiEstimateKillSwitch";
import { resolveAiEstimateCanaryEligibility } from "../../src/lib/ai/productionCanary";
import { enabledInternalCanaryConfig, killSwitchPolicy } from "./productionCanaryTestHelpers";

test("kill switch overrides internal canary eligibility", () => {
  const policy = killSwitchPolicy({ disable_all_ai_estimates: true });
  const eligibility = resolveAiEstimateCanaryEligibility({
    config: enabledInternalCanaryConfig(),
    isInternalStaff: true,
    manualOptIn: true,
    percentBucket: 0,
    killSwitch: policy,
  });
  const action = applyAiEstimateKillSwitchPolicy({ policy, entrypoint: "request", action: "estimate" });
  expect(eligibility.status).toBe("blocked_by_kill_switch");
  expect(action.blocked).toBe(true);
});
