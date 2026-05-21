import { guardAiSafeActionDraftExecution } from "../../../src/lib/ai/safeActions";
import { createAllSafeActionDraftFixtures } from "./safeActionsTestFixtures";

describe("AI safe action execution guard", () => {
  it("blocks final submit, auto approval and dangerous mutation for every draft", () => {
    const results = createAllSafeActionDraftFixtures().map(guardAiSafeActionDraftExecution);
    expect(results.every((result) => result.passed)).toBe(true);
    expect(results.every((result) => result.noFinalSubmit && result.noAutoApproval && result.noDangerousMutation)).toBe(true);
  });
});
