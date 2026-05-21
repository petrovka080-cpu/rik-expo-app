import { checkAiSafeActionPreconditions } from "../../../src/lib/ai/safeActions";
import { createSafeActionDraftFixture } from "./safeActionsTestFixtures";

describe("AI safe action precondition checker", () => {
  it("checks data, missing supplier and approval route before a purchase draft", () => {
    const draft = createSafeActionDraftFixture("procurement_purchase_draft");
    const checks = checkAiSafeActionPreconditions({
      actionKind: "procurement_purchase_draft",
      sourceRefIds: draft.sourceRefIds,
    });
    expect(checks.some((check) => check.status === "passed")).toBe(true);
    expect(checks.some((check) => check.status === "missing")).toBe(true);
    expect(checks.some((check) => check.status === "requires_review")).toBe(true);
  });
});
