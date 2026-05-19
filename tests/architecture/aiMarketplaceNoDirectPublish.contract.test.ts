import { MARKETPLACE_INTAKE_ROLE_POLICY, answerMarketplaceIntakeAction } from "../../src/lib/ai/marketplaceIntake";
import { buildMarketplaceIntakeFixture } from "../ai/aiMarketplaceIntake.fixture";

describe("Marketplace architecture no direct publish", () => {
  it("keeps publish disabled across role policy and moderation route", () => {
    expect(MARKETPLACE_INTAKE_ROLE_POLICY.supplier.directPublishAllowed).toBe(false);
    expect(MARKETPLACE_INTAKE_ROLE_POLICY.contractor.directPublishAllowed).toBe(false);
    const answer = answerMarketplaceIntakeAction({
      context: buildMarketplaceIntakeFixture(),
      actionId: "send_to_moderation",
    });
    expect(answer.published).toBe(false);
    expect(answer.directPublishPathUsed).toBe(false);
    expect(answer.answerRu).not.toMatch(/опубликован[ао]\s+сразу/i);
  });
});
