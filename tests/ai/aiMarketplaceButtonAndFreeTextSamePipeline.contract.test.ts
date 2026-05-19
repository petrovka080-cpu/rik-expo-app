import { answerMarketplaceIntakeAction, answerMarketplaceIntakeQuestion } from "../../src/lib/ai/marketplaceIntake";
import { buildMarketplaceIntakeFixture } from "./aiMarketplaceIntake.fixture";

describe("Marketplace buttons and free text use same pipeline", () => {
  it("routes action and free text through marketplaceIntakePipeline", () => {
    const context = buildMarketplaceIntakeFixture();
    const buttonAnswer = answerMarketplaceIntakeAction({ context, actionId: "add_product_draft" });
    const freeTextAnswer = answerMarketplaceIntakeQuestion({ context, questionRu: "+ добавить товар" });
    expect(buttonAnswer.providerTrace).toContain("marketplaceIntakePipeline");
    expect(freeTextAnswer.providerTrace).toContain("marketplaceIntakePipeline");
    expect(buttonAnswer.draft?.id).toBe(freeTextAnswer.draft?.id);
    expect(buttonAnswer.directPublishPathUsed).toBe(false);
    expect(freeTextAnswer.directOrderPathUsed).toBe(false);
  });
});
