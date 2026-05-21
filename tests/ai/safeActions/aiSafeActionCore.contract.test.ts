import { AI_SAFE_ACTION_GREEN_STATUS, AI_SAFE_ACTION_KINDS, AI_SAFE_ACTION_WAVE } from "../../../src/lib/ai/safeActions";
import { createAllSafeActionDraftFixtures, expectDraftIsSafe } from "./safeActionsTestFixtures";

describe("AI safe action core", () => {
  it("defines the point-of-no-return wave and safe draft families", () => {
    expect(AI_SAFE_ACTION_WAVE).toBe("S_AI_SAFE_ACTION_DRAFT_APPROVAL_ORCHESTRATOR_POINT_OF_NO_RETURN");
    expect(AI_SAFE_ACTION_GREEN_STATUS).toBe("GREEN_AI_SAFE_ACTION_DRAFT_APPROVAL_ORCHESTRATOR_READY");
    expect(AI_SAFE_ACTION_KINDS).toHaveLength(12);
  });

  it("builds every action as a safe draft", () => {
    const drafts = createAllSafeActionDraftFixtures();
    expect(drafts).toHaveLength(12);
    drafts.forEach(expectDraftIsSafe);
  });
});
