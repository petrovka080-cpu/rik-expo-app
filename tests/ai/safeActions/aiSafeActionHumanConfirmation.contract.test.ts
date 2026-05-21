import { assertAiSafeActionHumanConfirmationVisible } from "../../../src/lib/ai/safeActions";
import { createSafeActionDraftFixture } from "./safeActionsTestFixtures";

describe("AI safe action human confirmation", () => {
  it("requires users to see sources, diff, missing data, route and safety", () => {
    const draft = createSafeActionDraftFixture("procurement_purchase_draft");
    expect(assertAiSafeActionHumanConfirmationVisible(draft)).toBe(true);
    expect(draft.humanConfirmation.finalExecutionAllowed).toBe(false);
    expect(draft.humanConfirmation.userMustSee).toEqual(
      expect.arrayContaining(["source_refs", "impact_diff", "missing_data", "approval_route", "safety_status"]),
    );
  });
});
