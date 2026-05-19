import { answerMarketplaceIntakeAction } from "../../src/lib/ai/marketplaceIntake";
import { buildMarketplaceIntakeFixture } from "./aiMarketplaceIntake.fixture";

describe("Marketplace add service draft", () => {
  it("allows contractor service intake only when marketplace service permission exists", () => {
    const context = buildMarketplaceIntakeFixture({
      screenId: "contractor.main",
      role: "contractor",
      actorId: "CON-1",
      selectedOfferId: "MP-SERVICE-1",
      permissions: {
        canAddMarketplaceService: true,
        canSubmitModeration: true,
      },
    });
    const answer = answerMarketplaceIntakeAction({ context, actionId: "add_service_draft" });
    expect(answer.answerKind).toBe("service_draft");
    expect(answer.draft?.offerType).toBe("service");
    expect(answer.draft?.ownerId).toBe("CON-1");
    expect(answer.published).toBe(false);
    expect(answer.orderCreated).toBe(false);
  });
});
