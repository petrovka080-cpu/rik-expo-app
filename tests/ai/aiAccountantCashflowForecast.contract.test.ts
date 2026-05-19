import { answerAccountantAction } from "../../src/lib/ai/accountantFinance";
import { buildAccountantRealFinanceFixture } from "./aiAccountantRealFinance.fixture";

describe("accountant cashflow forecast", () => {
  it("labels forecast as forecast and keeps period/source grounding", () => {
    const answer = answerAccountantAction({
      context: buildAccountantRealFinanceFixture({ screenId: "finance.cashflow" }),
      actionId: "cashflow_forecast",
    });

    expect(answer.answerKind).toBe("cashflow_summary");
    expect(answer.forecastLabeledAsForecast).toBe(true);
    expect(answer.period?.labelRu).toBeTruthy();
    expect(answer.sourceTrace.length).toBeGreaterThan(0);
  });
});
