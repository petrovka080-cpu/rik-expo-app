import { answerContractorAcceptanceAction, buildDefaultContractorAcceptanceContext } from "../../src/lib/ai/contractorAcceptance";
import { expectContractorAnswerSafe } from "./aiContractorAcceptanceTestHelpers";

describe("contractor marketplace service draft", () => {
  it("prepares only a permission-scoped draft and never publishes the offer", () => {
    const answer = answerContractorAcceptanceAction({
      context: buildDefaultContractorAcceptanceContext({ marketplacePermission: true }),
      actionId: "contractor_marketplace_service_draft",
    });

    expect(answer.answerKind).toBe("marketplace_service_draft");
    expect(answer.status).toBe("draft_prepared");
    expect(answer.events.some((event) => event.eventType === "marketplace_service_draft")).toBe(true);
    expect(answer.finalSubmit).toBe(false);
    expectContractorAnswerSafe(answer);
  });
});
