import { applyAiEstimateKillSwitchPolicy } from "../../src/lib/ai/killSwitch/aiEstimateKillSwitch";
import { killSwitchScenario } from "./productionCanaryTestHelpers";

test("PDF generation can be disabled independently", () => {
  const result = applyAiEstimateKillSwitchPolicy(killSwitchScenario({ disable_pdf_generation: true }, "embedded_ai", "pdf"));
  expect(result.blocked).toBe(true);
  expect(result.reason).toBe("disable_pdf_generation");
});
