import { applyAiEstimateKillSwitchPolicy } from "../../src/lib/ai/killSwitch/aiEstimateKillSwitch";
import { killSwitchScenario } from "./productionCanaryTestHelpers";

test("request AI estimate can be disabled independently", () => {
  const result = applyAiEstimateKillSwitchPolicy(killSwitchScenario({ disable_request_ai_estimate: true }, "request", "estimate"));
  expect(result.blocked).toBe(true);
  expect(result.reason).toBe("disable_request_ai_estimate");
});
