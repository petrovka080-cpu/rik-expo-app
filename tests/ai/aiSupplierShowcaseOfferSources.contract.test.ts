import { answerMarketplaceIntakeAction } from "../../src/lib/ai/marketplaceIntake";
import { buildMarketplaceIntakeFixture } from "./aiMarketplaceIntake.fixture";

describe("Supplier showcase offer sources", () => {
  it("keeps supplier showcase source-backed and non-generic", () => {
    const answer = answerMarketplaceIntakeAction({
      context: buildMarketplaceIntakeFixture({ screenId: "supplier.showcase" }),
      actionId: "show_risks",
    });
    expect(answer.genericAnswerUsed).toBe(false);
    expect(answer.sourceTrace.length).toBeGreaterThan(0);
    expect(answer.fakePriceCreated).toBe(false);
    expect(answer.fakeAvailabilityCreated).toBe(false);
    expect(answer.directOrderPathUsed).toBe(false);
  });
});
