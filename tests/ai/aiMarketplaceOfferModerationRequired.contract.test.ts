import { answerMarketplaceIntakeAction } from "../../src/lib/ai/marketplaceIntake";
import { buildMarketplaceIntakeFixture } from "./aiMarketplaceIntake.fixture";

describe("Marketplace offer moderation", () => {
  it("prepares moderation route without direct publish or approval bypass", () => {
    const answer = answerMarketplaceIntakeAction({
      context: buildMarketplaceIntakeFixture(),
      actionId: "send_to_moderation",
    });
    expect(answer.answerKind).toBe("moderation_route");
    expect(answer.moderationRequired).toBe(true);
    expect(answer.changedData).toBe(false);
    expect(answer.published).toBe(false);
    expect(answer.autoApproval).toBe(false);
    expect(answer.approvalBypassUsed).toBe(false);
    expect(answer.answerRu).toContain("модерац");
  });
});
