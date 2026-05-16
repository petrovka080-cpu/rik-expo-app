import { listAiScreenWorkflowPacks } from "../../src/features/ai/screenWorkflows/aiScreenWorkflowEngine";
import { containsForbiddenAiScreenWorkflowUserCopy } from "../../src/features/ai/screenWorkflows/aiScreenWorkflowUserCopy";

describe("AI screen workflows hide debug user UI", () => {
  it("keeps debug, provider and raw runtime copy out of generated workflow packs", () => {
    const text = JSON.stringify(listAiScreenWorkflowPacks());

    expect(containsForbiddenAiScreenWorkflowUserCopy(text)).toBe(false);
  });
});
