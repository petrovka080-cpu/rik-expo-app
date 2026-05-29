import { answerBuiltInAi } from "../../src/lib/ai/builtInAi";
import { expectMeasuredStepWithinBudget, REPRESENTATIVE_PROMPT } from "./aiEstimatePerformanceBudgetTestHelpers";

describe("estimate latency budget", () => {
  it("keeps full visible estimate under enterprise budget", () => {
    const answer = expectMeasuredStepWithinBudget("full_visible_estimate", () =>
      answerBuiltInAi({
        text: REPRESENTATIVE_PROMPT,
        route: "/request",
        screenContext: "request",
        role: "consumer",
        countryCode: "KG",
        cityOrRegion: "Bishkek",
      }),
    );
    expect(answer.route.intent).toBe("estimate");
    expect(answer.toolResult.estimate).toBeDefined();
  });
});
