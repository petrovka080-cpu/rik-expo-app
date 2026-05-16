import { listAiScreenWorkflowPacks } from "../../src/features/ai/screenWorkflows/aiScreenWorkflowEngine";

describe("AI screen workflows are not generic chat only", () => {
  it("requires prepared work and actions on every screen", () => {
    const generic = listAiScreenWorkflowPacks().filter((pack) => pack.readyBlocks.length === 0 || pack.actions.length === 0);

    expect(generic).toEqual([]);
  });
});
