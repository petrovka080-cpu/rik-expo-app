import { listAiScreenWorkflowPacks } from "../../src/features/ai/screenWorkflows/aiScreenWorkflowEngine";
import { validateAiScreenWorkflowPacks } from "../../src/features/ai/screenWorkflows/aiScreenWorkflowPolicy";

describe("AI screen workflow policy", () => {
  it("validates all workflow packs as safe and non-mutating", () => {
    const result = validateAiScreenWorkflowPacks(listAiScreenWorkflowPacks());

    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
  });
});
