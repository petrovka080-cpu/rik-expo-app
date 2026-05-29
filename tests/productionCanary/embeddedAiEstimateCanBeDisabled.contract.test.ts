import { applyAiEstimateKillSwitchPolicy } from "../../src/lib/ai/killSwitch/aiEstimateKillSwitch";
import { killSwitchScenario } from "./productionCanaryTestHelpers";

test("embedded AI estimate can be disabled independently", () => {
  const result = applyAiEstimateKillSwitchPolicy(killSwitchScenario({ disable_embedded_ai_estimate: true }, "embedded_ai", "estimate"));
  expect(result.blocked).toBe(true);
  expect(result.reason).toBe("disable_embedded_ai_estimate");
});
