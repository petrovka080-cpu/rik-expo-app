import { listAiLiveScreenButtonsForScreen } from "../../src/lib/ai/liveScreenCopilot";
import { answerAiLiveScreenButtonFixture } from "./aiLiveScreenCopilotTestHelpers";

describe("AI live screen buyer buttons", () => {
  it("checks warehouse and suppliers before external sources", () => {
    const buttons = listAiLiveScreenButtonsForScreen("buyer");
    expect(buttons.map((button) => button.labelRu)).toEqual(expect.arrayContaining([
      "Показать заявки в закупку",
      "Подобрать варианты по заявке",
      "Найти поставщиков",
    ]));
    const supplierButton = buttons.find((button) => button.id === "buyer.find_suppliers")!;
    expect(supplierButton.sourcePlanHint).toEqual(expect.arrayContaining(["internal_marketplace", "supplier_history"]));
    const result = answerAiLiveScreenButtonFixture(supplierButton.id);
    expect(result.guard.failureReason).toBeUndefined();
    expect(result.universalAnswer.sourcePlan.sourceOrder.indexOf("internal_marketplace")).toBeLessThan(
      result.universalAnswer.sourcePlan.sourceOrder.includes("public_web")
        ? result.universalAnswer.sourcePlan.sourceOrder.indexOf("public_web")
        : 999,
    );
  });
});
