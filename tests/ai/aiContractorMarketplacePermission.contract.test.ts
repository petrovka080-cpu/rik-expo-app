import { answerMarketplaceIntakeAction, buildMarketplaceIntakeAiBlockViewModel } from "../../src/lib/ai/marketplaceIntake";
import { buildMarketplaceIntakeFixture } from "./aiMarketplaceIntake.fixture";

describe("Contractor marketplace permissions", () => {
  it("hides supplier actions from contractor without marketplace permission", () => {
    const context = buildMarketplaceIntakeFixture({
      screenId: "contractor.main",
      role: "contractor",
      actorId: "CON-1",
      selectedOfferId: "MP-SERVICE-1",
    });
    const viewModel = buildMarketplaceIntakeAiBlockViewModel(context);
    expect(viewModel.visibleActionLabelsRu).not.toContain("+ Добавить услугу");
    expect(viewModel.visibleActionLabelsRu).not.toContain("+ Добавить товар");

    const answer = answerMarketplaceIntakeAction({ context, actionId: "add_service_draft" });
    expect(answer.answerKind).toBe("permission_limited");
    expect(answer.published).toBe(false);
    expect(answer.orderCreated).toBe(false);
  });
});
