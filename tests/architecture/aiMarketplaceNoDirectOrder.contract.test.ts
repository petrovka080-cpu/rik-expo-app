import { MARKETPLACE_INTAKE_ROLE_POLICY, answerMarketplaceIntakeAction } from "../../src/lib/ai/marketplaceIntake";
import { buildMarketplaceIntakeFixture } from "../ai/aiMarketplaceIntake.fixture";

describe("Marketplace architecture no direct order", () => {
  it("does not create orders from marketplace intake or supplier showcase", () => {
    expect(MARKETPLACE_INTAKE_ROLE_POLICY.supplier.directOrderAllowed).toBe(false);
    expect(MARKETPLACE_INTAKE_ROLE_POLICY.buyer.directOrderAllowed).toBe(false);
    const answer = answerMarketplaceIntakeAction({
      context: buildMarketplaceIntakeFixture({ screenId: "supplier.showcase", role: "buyer", actorId: "BUYER-1" }),
      actionId: "add_to_shortlist_draft",
    });
    expect(answer.orderCreated).toBe(false);
    expect(answer.paymentCreated).toBe(false);
    expect(answer.directOrderPathUsed).toBe(false);
  });
});
